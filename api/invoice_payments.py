import os
import secrets
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user

router = APIRouter()

PAYSTACK_BASE_URL = "https://api.paystack.co"


def _paystack_headers():
    return {"Authorization": f"Bearer {os.environ.get('DOCDUTY_PAYSTACK_SECRET_KEY')}"}


@router.post("/invoices/{invoice_id}/payment-link")
def generate_payment_link(invoice_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM invoices WHERE id = %s AND account_id = %s AND document_type = 'invoice'",
        (invoice_id, account["id"]),
    )
    invoice = cur.fetchone()

    if not invoice:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice["payment_status"] == "paid":
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="This invoice has already been paid")

    # Ensure a share_token exists so this invoice has a real public URL
    share_token = invoice["share_token"]
    if not share_token:
        share_token = secrets.token_urlsafe(24)
        cur.execute("UPDATE invoices SET share_token = %s WHERE id = %s", (share_token, invoice_id))

    reference = f"inv-{invoice_id}-{secrets.token_hex(6)}"

    email = invoice["bill_to_email"] or f"customer+{invoice_id}@docduty.app"
    callback_url = f"{os.environ.get('APP_FRONTEND_URL')}/pay/{share_token}"

    response = requests.post(
        f"{PAYSTACK_BASE_URL}/transaction/initialize",
        headers=_paystack_headers(),
        json={
            "email": email,
            "amount": invoice["total_kobo"],
            "reference": reference,
            "callback_url": callback_url,
        },
    )
    response.raise_for_status()
    data = response.json()["data"]

    cur.execute(
        "UPDATE invoices SET paystack_reference = %s WHERE id = %s",
        (reference, invoice_id),
    )
    conn.commit()
    cur.close()
    conn.close()

    return {
        "payment_url": data["authorization_url"],
        "share_url": f"{os.environ.get('APP_FRONTEND_URL')}/pay/{share_token}",
        "reference": reference,
    }


@router.get("/public/invoices/{share_token}")
def get_public_invoice(share_token: str):
    """
    No authentication required — this is what a customer sees when they
    click a WhatsApp-shared payment link. Deliberately returns only what's
    needed to view and pay, nothing about the business's other data.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT i.id, i.invoice_number, i.bill_to_name, i.total_kobo, i.payment_status,
               i.paystack_reference, a.business_name
        FROM invoices i JOIN accounts a ON a.id = i.account_id
        WHERE i.share_token = %s
        """,
        (share_token,),
    )
    invoice = cur.fetchone()
    cur.close()
    conn.close()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "invoice_number": invoice["invoice_number"],
        "business_name": invoice["business_name"],
        "bill_to_name": invoice["bill_to_name"],
        "total_naira": invoice["total_kobo"] / 100,
        "payment_status": invoice["payment_status"],
        "reference": invoice["paystack_reference"],
    }


@router.get("/public/invoices/{share_token}/verify")
def verify_public_payment(share_token: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, paystack_reference, payment_status FROM invoices WHERE share_token = %s", (share_token,))
    invoice = cur.fetchone()

    if not invoice:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice["payment_status"] == "paid":
        cur.close()
        conn.close()
        return {"payment_status": "paid"}

    response = requests.get(
        f"{PAYSTACK_BASE_URL}/transaction/verify/{invoice['paystack_reference']}",
        headers=_paystack_headers(),
    )
    response.raise_for_status()
    data = response.json()["data"]

    if data["status"] == "success":
        cur.execute("UPDATE invoices SET payment_status = 'paid' WHERE id = %s", (invoice["id"],))
        conn.commit()
        cur.close()
        conn.close()
        return {"payment_status": "paid"}

    cur.close()
    conn.close()
    return {"payment_status": "unpaid"}
