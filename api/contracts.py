import re
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from psycopg2.extras import Json
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from pdf_generator import generate_contract_pdf
from subscription_utils import enforce_document_limit

router = APIRouter()


def render_template(body_template: str, field_values: dict) -> str:
    def resolve_conditional(match):
        field_name = match.group(1)
        section_content = match.group(2)
        value = field_values.get(field_name)
        is_truthy = bool(value) and str(value).lower() not in ("false", "no", "0", "")
        return section_content if is_truthy else ""

    rendered = re.sub(
        r"\{\{#if (\w+)\}\}(.*?)\{\{/if\}\}",
        resolve_conditional,
        body_template,
        flags=re.DOTALL,
    )

    for field_name, value in field_values.items():
        rendered = rendered.replace(f"{{{{{field_name}}}}}", str(value))

    return rendered

from pydantic import BaseModel as PydanticBaseModel
from rate_tables import require_admin


class TemplateInput(PydanticBaseModel):
    name: str
    slug: str
    fields: list[dict]
    body_template: str


@router.post("/admin/contract-templates")
def create_template(input: TemplateInput, user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO contract_templates (name, slug, fields, body_template) VALUES (%s, %s, %s, %s) RETURNING id",
        (input.name, input.slug, Json(input.fields), input.body_template),
    )
    template_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Template created", "template_id": template_id}


@router.put("/admin/contract-templates/{template_id}")
def update_template(template_id: int, input: TemplateInput, user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE contract_templates SET name = %s, fields = %s, body_template = %s WHERE id = %s RETURNING id",
        (input.name, Json(input.fields), input.body_template, template_id),
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"message": "Template updated successfully"}

@router.get("/contract-templates")
def list_templates(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, slug, fields, relevant_categories FROM contract_templates ORDER BY name")
    templates = cur.fetchall()
    cur.close()
    conn.close()

    # Simple keyword-based relevance check against the business's own description —
    # doesn't hide anything, just marks which templates are likely most relevant
    description = (account.get("business_description") or "").lower()
    category_keywords = {
        "services": ["service", "consulting", "agency", "freelance"],
        "consulting": ["consult", "advisory"],
        "freelance": ["freelance", "independent"],
        "retail": ["shop", "store", "retail", "sell", "sales"],
        "food": ["food", "restaurant", "catering", "kitchen"],
    }

    for t in templates:
        categories = t.get("relevant_categories") or []
        if "all" in categories:
            t["recommended"] = True
        else:
            t["recommended"] = any(
                keyword in description
                for cat in categories
                for keyword in category_keywords.get(cat, [])
            )

    return {"templates": templates}


class ContractInput(BaseModel):
    client_id: int
    template_id: int
    field_values: dict


@router.post("/contracts")
def create_contract(input: ContractInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM clients WHERE id = %s AND account_id = %s", (input.client_id, account["id"]))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")

    cur.execute("SELECT id, name, fields, body_template FROM contract_templates WHERE id = %s", (input.template_id,))
    template = cur.fetchone()
    if not template:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    cur.close()
    conn.close()
    enforce_document_limit(account["id"], account)
    conn = get_connection()
    cur = conn.cursor()

    required_fields = [f["name"] for f in template["fields"] if f["type"] != "checkbox"]
    missing = [f for f in required_fields if f not in input.field_values]
    if missing:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    rendered_body = render_template(template["body_template"], input.field_values)

    cur.execute(
        """
        INSERT INTO contracts (account_id, client_id, template_id, field_values, rendered_body)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (account["id"], input.client_id, input.template_id, Json(input.field_values), rendered_body),
    )
    contract_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Contract generated successfully", "contract_id": contract_id, "template_name": template["name"]}


@router.get("/contracts/{contract_id}/pdf")
def download_contract_pdf(contract_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.id, c.rendered_body, ct.name as template_name
        FROM contracts c JOIN contract_templates ct ON ct.id = c.template_id
        WHERE c.id = %s AND c.account_id = %s
        """,
        (contract_id, account["id"]),
    )
    contract = cur.fetchone()
    cur.close()
    conn.close()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    pdf_bytes = generate_contract_pdf(contract["rendered_body"], contract["template_name"], account)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contract-{contract_id}.pdf"},
    )
