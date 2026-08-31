import os
from invoices import create_invoice_internal
from calculators import calculate_vat_internal
from clients import list_clients_internal
from deadlines import list_deadlines_internal
from database import get_connection
from knowledge_base import search_knowledge
from health_score import get_health_score_internal

def execute_tool(tool_name: str, tool_input: dict, account: dict, user_id: int) -> dict:
    """
    Runs the actual backend logic for a tool Claude decided to call.
    This is the ONLY bridge between the AI's decision and real data changes —
    every function called here already enforces the same ownership checks,
    validation, and VAT calculation as the normal REST endpoints.
    """
    if tool_name == "create_invoice":
        return create_invoice_internal(
            account=account,
            client_id=tool_input["client_id"],
            document_type=tool_input["document_type"],
            bill_to_name=tool_input["bill_to_name"],
            items=tool_input["items"],
            due_date=tool_input.get("due_date"),
        )

    elif tool_name == "calculate_vat":
        return calculate_vat_internal(tool_input["amount_naira"])

    elif tool_name == "list_clients":
        return list_clients_internal(account["id"])

    elif tool_name == "list_deadlines":
        return list_deadlines_internal(account["id"])

    elif tool_name == "save_business_profile":
        return save_business_profile_internal(account["id"], tool_input)

    elif tool_name == "search_compliance_knowledge":
        return search_compliance_knowledge_internal(tool_input["query"])

    elif tool_name == "get_compliance_health_score":
        return get_health_score_internal(account)

    elif tool_name == "get_document_link":
        return get_document_link_internal(tool_input["document_id"], tool_input["document_kind"], account)

    return {"error": f"Unknown tool: {tool_name}"}


def get_document_link_internal(document_id: int, document_kind: str, account: dict) -> dict:
    import os
    from database import get_connection

    frontend_url = os.environ.get("APP_FRONTEND_URL", "")

    conn = get_connection()
    cur = conn.cursor()

    if document_kind == "invoice":
        cur.execute("SELECT id FROM invoices WHERE id = %s AND account_id = %s", (document_id, account["id"]))
        exists = cur.fetchone()
        link = f"{frontend_url}/documents/{document_id}"
    else:
        cur.execute("SELECT id FROM contracts WHERE id = %s AND account_id = %s", (document_id, account["id"]))
        exists = cur.fetchone()
        link = f"{frontend_url}/documents/contracts/{document_id}"

    cur.close()
    conn.close()

    if not exists:
        return {"error": "Document not found or doesn't belong to this account"}

    return {"link": link, "note": "This link opens the document in DocDuty, where it can be downloaded as a PDF."}


def save_business_profile_internal(account_id: int, fields: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor()

    updates = []
    values = []

    for field_name in ["legal_structure", "business_description", "staff_size_range", "office_status", "state", "monthly_revenue_range", "staff_salary_range"]:
        if field_name in fields:
            updates.append(f"{field_name} = %s")
            values.append(fields[field_name])

    if "onboarding_complete" in fields:
        updates.append("onboarding_completed = %s")
        values.append(fields["onboarding_complete"])

    if updates:
        values.append(account_id)
        cur.execute(f"UPDATE accounts SET {', '.join(updates)} WHERE id = %s", values)
        conn.commit()

    cur.close()
    conn.close()

    return {"message": "Profile updated", "fields_saved": list(fields.keys())}


def search_compliance_knowledge_internal(query: str) -> dict:
    results = search_knowledge(query, top_k=5)

    if not results:
        return {
            "found": False,
            "message": "No relevant regulatory information found in the knowledge base for this query yet.",
        }

    return {
        "found": True,
        "results": [
            {
                "content": r["content"],
                "source": r["source_name"],
                "agency": r["agency"],
                "url": r["url"],
                "relevance": round(r["similarity"], 3),
            }
            for r in results
        ],
    }
