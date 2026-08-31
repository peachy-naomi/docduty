from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from rate_tables import get_current_rate
from pdf_generator import generate_invoice_pdf
from subscription_utils import enforce_document_limit

router = APIRouter()

DOCUMENT_PREFIXES = {"invoice": "INV", "receipt": "RCT", "quotation": "QUO"}


class InvoiceItemInput(BaseModel):
    description: str
    quantity: float
    unit_price_naira: float


class InvoiceInput(BaseModel):
    client_id: int
    document_type: str
    bill_to_name: str
    bill_to_email: str | None = None
    bill_to_address: str | None = None
    due_date: date | None = None
    notes: str | None = None
    items: list[InvoiceItemInput]


def get_next_invoice_number(account_id: int, document_type: str) -> str:
    prefix = DOCUMENT_PREFIXES.get(document_type, "DOC")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) as count FROM invoices WHERE account_id = %s AND document_type = %s",
        (account_id, document_type),
    )
    count = cur.fetchone()["count"]
    cur.close()
    conn.close()
    return f"{prefix}-{account_id:04d}-{count + 1:05d}"


def create_invoice_internal(account: dict, client_id: int, document_type: str, bill_to_name: str, items: list, due_date=None, bill_to_email=None, bill_to_address=None, notes=None) -> dict:
    if document_type not in ("invoice", "receipt", "quotation"):
        raise HTTPException(status_code=400, detail="document_type must be 'invoice', 'receipt', or 'quotation'")
    if not items:
        raise HTTPException(status_code=400, detail="An invoice must have at least one line item")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM clients WHERE id = %s AND account_id = %s", (client_id, account["id"]))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")
    cur.close()
    conn.close()

    enforce_document_limit(account["id"], account)

    conn = get_connection()
    cur = conn.cursor()

    subtotal_kobo = 0
    line_items = []
    for item in items:
        unit_price_kobo = round(item["unit_price_naira"] * 100)
        line_total_kobo = round(unit_price_kobo * item["quantity"])
        subtotal_kobo += line_total_kobo
        line_items.append((item["description"], item["quantity"], unit_price_kobo, line_total_kobo))

    vat_rate = get_current_rate("vat")
    vat_percent = vat_rate["rate_data"]["rate_percent"]
    vat_amount_kobo = round(subtotal_kobo * (vat_percent / 100))
    total_kobo = subtotal_kobo + vat_amount_kobo

    invoice_number = get_next_invoice_number(account["id"], document_type)

    cur.execute(
        """
        INSERT INTO invoices (
            account_id, client_id, invoice_number, document_type, issue_date, due_date,
            bill_to_name, bill_to_email, bill_to_address,
            subtotal_kobo, vat_rate_percent, vat_amount_kobo, total_kobo, notes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            account["id"], client_id, invoice_number, document_type, date.today(), due_date,
            bill_to_name, bill_to_email, bill_to_address,
            subtotal_kobo, vat_percent, vat_amount_kobo, total_kobo, notes,
        ),
    )
    invoice_id = cur.fetchone()["id"]

    for description, quantity, unit_price_kobo, line_total_kobo in line_items:
        cur.execute(
            """
            INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_kobo, line_total_kobo)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (invoice_id, description, quantity, unit_price_kobo, line_total_kobo),
        )

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": f"{document_type.capitalize()} created successfully",
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "subtotal_naira": subtotal_kobo / 100,
        "vat_amount_naira": vat_amount_kobo / 100,
        "total_naira": total_kobo / 100,
    }


@router.post("/invoices")
def create_invoice(input: InvoiceInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    return create_invoice_internal(
        account=account,
        client_id=input.client_id,
        document_type=input.document_type,
        bill_to_name=input.bill_to_name,
        items=[item.dict() for item in input.items],
        due_date=input.due_date,
        bill_to_email=input.bill_to_email,
        bill_to_address=input.bill_to_address,
        notes=input.notes,
    )


@router.get("/invoices")
def list_invoices(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT i.id, i.invoice_number, i.document_type, i.issue_date, i.status,
               i.total_kobo, c.business_name as client_name
        FROM invoices i JOIN clients c ON c.id = i.client_id
        WHERE i.account_id = %s ORDER BY i.created_at DESC
        """,
        (account["id"],),
    )
    invoices = cur.fetchall()
    cur.close()
    conn.close()

    for inv in invoices:
        inv["total_naira"] = inv.pop("total_kobo") / 100

    return {"invoices": invoices}


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM invoices WHERE id = %s AND account_id = %s", (invoice_id, account["id"]))
    invoice = cur.fetchone()

    if not invoice:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    cur.execute(
        "SELECT description, quantity, unit_price_kobo, line_total_kobo FROM invoice_items WHERE invoice_id = %s",
        (invoice_id,),
    )
    items = cur.fetchall()
    cur.close()
    conn.close()

    invoice["items"] = items
    return invoice


@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM invoices WHERE id = %s AND account_id = %s", (invoice_id, account["id"]))
    invoice = cur.fetchone()

    if not invoice:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    cur.execute(
        "SELECT description, quantity, unit_price_kobo, line_total_kobo FROM invoice_items WHERE invoice_id = %s",
        (invoice_id,),
    )
    invoice["items"] = cur.fetchall()
    cur.close()
    conn.close()

    pdf_bytes = generate_invoice_pdf(invoice, account)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={invoice['invoice_number']}.pdf"},
    )
