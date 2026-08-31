import qrcode
from io import BytesIO
from fastapi import APIRouter, HTTPException, Response
from database import get_connection

router = APIRouter()


@router.get("/public/verify/invoice/{invoice_id}")
def verify_invoice_document(invoice_id: int):
    """
    Public, no-login verification — anyone with the document (or who scans
    its QR code) can confirm it genuinely came from DocDuty and matches
    what's actually on record, without seeing any other account data.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT i.invoice_number, i.document_type, i.issue_date, i.total_kobo,
               i.bill_to_name, a.business_name
        FROM invoices i JOIN accounts a ON a.id = i.account_id
        WHERE i.id = %s
        """,
        (invoice_id,),
    )
    invoice = cur.fetchone()
    cur.close()
    conn.close()

    if not invoice:
        raise HTTPException(status_code=404, detail="No matching document found. This document may not be genuine.")

    return {
        "verified": True,
        "document_type": invoice["document_type"],
        "reference": invoice["invoice_number"],
        "issued_by": invoice["business_name"],
        "issued_to": invoice["bill_to_name"],
        "issue_date": str(invoice["issue_date"]),
        "amount_naira": invoice["total_kobo"] / 100,
    }


@router.get("/public/verify/contract/{contract_id}")
def verify_contract_document(contract_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.created_at, ct.name as template_name, a.business_name
        FROM contracts c
        JOIN contract_templates ct ON ct.id = c.template_id
        JOIN accounts a ON a.id = c.account_id
        WHERE c.id = %s
        """,
        (contract_id,),
    )
    contract = cur.fetchone()
    cur.close()
    conn.close()

    if not contract:
        raise HTTPException(status_code=404, detail="No matching document found. This document may not be genuine.")

    return {
        "verified": True,
        "document_type": contract["template_name"],
        "issued_by": contract["business_name"],
        "issue_date": str(contract["created_at"]),
    }


@router.get("/invoices/{invoice_id}/qr")
def get_invoice_qr(invoice_id: int):
    """
    Generates a QR code image pointing at the public verification page.
    No auth required to fetch the QR image itself, since it just contains
    a URL — the actual sensitive data is behind the PDF download, which
    stays properly authenticated.
    """
    import os
    verify_url = f"{os.environ.get('APP_FRONTEND_URL')}/verify/invoice/{invoice_id}"

    qr = qrcode.QRCode(box_size=4, border=1)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return Response(content=buffer.read(), media_type="image/png")
