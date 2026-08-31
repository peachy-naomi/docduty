import os
import json
from anthropic import Anthropic
from database import get_connection
from knowledge_base import search_knowledge

ANALYSIS_PROMPT = """You are analyzing what regulatory compliance requirements apply to a specific
Nigerian business, based on real regulatory information retrieved for their situation.

Business profile:
- Legal structure: {legal_structure}
- What they do: {business_description}
- State: {state}
- Staff size: {staff_size_range}
- Monthly revenue: {monthly_revenue_range}

Relevant regulatory information retrieved for this business:
{knowledge_context}

What this business already has on file with DocDuty:
{existing_documents}

Based ONLY on the regulatory information provided above (do not use general knowledge beyond
what's given), identify 3-6 specific compliance requirements that genuinely apply to this
business. For each one, assess whether it appears to be met based on what they have on file.

Respond ONLY with a JSON array, no other text, in this exact format:
[
  {{
    "requirement": "short, specific requirement description",
    "status": "met" or "not_met" or "unknown",
    "reasoning": "one sentence explaining why, referencing the source information",
    "source_agency": "which agency this relates to"
  }}
]

If the provided regulatory information doesn't clearly cover this business's situation, return
fewer, more general items rather than inventing specifics not supported by the source material."""


def run_compliance_analysis(account: dict) -> list[dict]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("AI assistant is not configured")

    search_query = f"{account.get('legal_structure', '')} {account.get('business_description', '')} {account.get('state', '')} compliance requirements"
    knowledge_results = search_knowledge(search_query, top_k=8)

    if not knowledge_results:
        knowledge_context = "No specific regulatory information has been indexed yet for this type of query."
    else:
        knowledge_context = "\n\n".join(
            f"[Source: {r['source_name']} — {r['agency']}]\n{r['content']}"
            for r in knowledge_results
        )

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT COUNT(*) as count FROM invoices WHERE account_id = %s AND document_type IN ('invoice', 'receipt')",
        (account["id"],),
    )
    has_invoice = cur.fetchone()["count"] > 0

    cur.execute(
        """
        SELECT ct.slug FROM contracts c JOIN contract_templates ct ON ct.id = c.template_id
        WHERE c.account_id = %s
        """,
        (account["id"],),
    )
    contract_slugs = [row["slug"] for row in cur.fetchall()]

    existing_documents = (
        f"Has generated an invoice/receipt: {has_invoice}. "
        f"Has these contract/policy types on file: {contract_slugs or 'none'}."
    )

    prompt = ANALYSIS_PROMPT.format(
        legal_structure=account.get("legal_structure") or "Not specified",
        business_description=account.get("business_description") or "Not specified",
        state=account.get("state") or "Not specified",
        staff_size_range=account.get("staff_size_range") or "Not specified",
        monthly_revenue_range=account.get("monthly_revenue_range") or "Not specified",
        knowledge_context=knowledge_context,
        existing_documents=existing_documents,
    )

    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text")
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]

    requirements = json.loads(raw_text)

    cur.execute("DELETE FROM compliance_requirements WHERE account_id = %s", (account["id"],))
    for req in requirements:
        cur.execute(
            """
            INSERT INTO compliance_requirements (account_id, requirement, status, reasoning, source_agency)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (account["id"], req["requirement"], req["status"], req["reasoning"], req.get("source_agency")),
        )
    conn.commit()
    cur.close()
    conn.close()

    return requirements
