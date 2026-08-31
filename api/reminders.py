from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Response
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from pdf_generator import generate_reminder_pdf

router = APIRouter()


@router.get("/invoices/{invoice_id}/reminder")
def download_reminder(invoice_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM invoices WHERE id = %s AND account_id = %s AND document_type = 'invoice'",
        (invoice_id, account["id"]),
    )
    invoice = cur.fetchone()
    cur.close()
    conn.close()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice["due_date"]:
        raise HTTPException(status_code=400, detail="This invoice has no due date set")
    if invoice["due_date"] >= date.today():
        raise HTTPException(status_code=400, detail="This invoice is not yet overdue")

    days_overdue = (date.today() - invoice["due_date"]).days
    pdf_bytes = generate_reminder_pdf(invoice, account, days_overdue)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=reminder-{invoice['invoice_number']}.pdf"},
    )
