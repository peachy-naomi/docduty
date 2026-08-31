from datetime import date
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_invoice_pdf(invoice: dict, account: dict) -> bytes:
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header band — uses the business's own brand color if set, otherwise DocDuty purple
    header_color = account.get("brand_color") or "#7c3aed"
    try:
        doc.setFillColor(colors.HexColor(header_color))
    except Exception:
        doc.setFillColor(colors.HexColor("#7c3aed"))
    doc.rect(0, height - 30 * mm, width, 30 * mm, fill=True, stroke=False)

    logo_url = account.get("logo_url")
    if logo_url:
        try:
            import base64
            from reportlab.lib.utils import ImageReader
            logo_data = base64.b64decode(logo_url.split(",")[-1])
            logo_image = ImageReader(BytesIO(logo_data))
            doc.drawImage(logo_image, 20 * mm, height - 26 * mm, width=18 * mm, height=18 * mm, mask='auto', preserveAspectRatio=True)
            text_x = 42 * mm
        except Exception as e:
            print(f"DEBUG logo render error: {e}")
            text_x = 20 * mm
    else:
        text_x = 20 * mm

    doc.setFillColor(colors.white)
    doc.setFont("Helvetica-Bold", 20)
    doc.drawString(text_x, height - 15 * mm, account.get("business_name", "DocDuty"))
    doc.setFont("Helvetica", 11)
    doc.drawString(text_x, height - 22 * mm, invoice["document_type"].upper())

    y = height - 45 * mm
    doc.setFillColor(colors.black)

    # Invoice meta
    doc.setFont("Helvetica-Bold", 10)
    doc.drawString(20 * mm, y, f"{'Receipt' if invoice['document_type'] == 'receipt' else 'Invoice'} #: {invoice['invoice_number']}")
    doc.drawString(20 * mm, y - 6 * mm, f"Date: {invoice['issue_date']}")
    if invoice.get("due_date"):
        doc.drawString(20 * mm, y - 12 * mm, f"Due: {invoice['due_date']}")

    # Bill to
    doc.setFont("Helvetica-Bold", 10)
    doc.drawString(120 * mm, y, "Bill To:")
    doc.setFont("Helvetica", 10)
    doc.drawString(120 * mm, y - 6 * mm, invoice["bill_to_name"])
    if invoice.get("bill_to_email"):
        doc.drawString(120 * mm, y - 12 * mm, invoice["bill_to_email"])

    # Line items table header
    y -= 30 * mm
    doc.setFillColor(colors.HexColor("#f3f0fa"))
    doc.rect(20 * mm, y - 6 * mm, width - 40 * mm, 8 * mm, fill=True, stroke=False)
    doc.setFillColor(colors.black)
    doc.setFont("Helvetica-Bold", 9)
    doc.drawString(22 * mm, y - 4 * mm, "Description")
    doc.drawString(120 * mm, y - 4 * mm, "Qty")
    doc.drawString(140 * mm, y - 4 * mm, "Unit Price")
    doc.drawString(170 * mm, y - 4 * mm, "Total")

    y -= 14 * mm
    doc.setFont("Helvetica", 9)
    for item in invoice["items"]:
        doc.drawString(22 * mm, y, item["description"][:50])
        doc.drawString(120 * mm, y, str(item["quantity"]))
        doc.drawString(140 * mm, y, f"NGN {item['unit_price_kobo'] / 100:,.2f}")
        doc.drawString(170 * mm, y, f"NGN {item['line_total_kobo'] / 100:,.2f}")
        y -= 8 * mm

    # Totals
    y -= 6 * mm
    doc.line(120 * mm, y, width - 20 * mm, y)
    y -= 8 * mm
    doc.setFont("Helvetica", 10)
    doc.drawString(140 * mm, y, "Subtotal:")
    doc.drawRightString(width - 20 * mm, y, f"NGN {invoice['subtotal_kobo'] / 100:,.2f}")
    y -= 7 * mm
    doc.drawString(140 * mm, y, f"VAT ({invoice['vat_rate_percent']}%):")
    doc.drawRightString(width - 20 * mm, y, f"NGN {invoice['vat_amount_kobo'] / 100:,.2f}")
    y -= 9 * mm
    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(140 * mm, y, "Total:")
    doc.drawRightString(width - 20 * mm, y, f"NGN {invoice['total_kobo'] / 100:,.2f}")

    # Notes
    if invoice.get("notes"):
        y -= 20 * mm
        doc.setFont("Helvetica", 9)
        doc.drawString(20 * mm, y, f"Notes: {invoice['notes']}")

        # QR verification code + footer
    try:
        import qrcode
        import os
        from reportlab.lib.utils import ImageReader

        verify_url = f"{os.environ.get('APP_FRONTEND_URL')}/verify/invoice/{invoice['id']}"
        qr = qrcode.QRCode(box_size=3, border=1)
        qr.add_data(verify_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")

        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        qr_reader = ImageReader(qr_buffer)

        doc.drawImage(qr_reader, width - 35 * mm, 8 * mm, width=20 * mm, height=20 * mm)
        doc.setFont("Helvetica", 6)
        doc.setFillColor(colors.grey)
        doc.drawRightString(width - 17.5 * mm, 6 * mm, "Scan to verify")
    except Exception as e:
        print(f"DEBUG QR generation error: {e}")

    doc.setFont("Helvetica", 7)
    doc.setFillColor(colors.grey)
    doc.drawCentredString(width / 2, 15 * mm, "Generated with DocDuty — docduty.app")

    doc.save()
    buffer.seek(0)
    return buffer.read()

def generate_reminder_pdf(invoice: dict, account: dict, days_overdue: int) -> bytes:
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    doc.setFillColor(colors.HexColor("#dc2626"))
    doc.rect(0, height - 30 * mm, width, 30 * mm, fill=True, stroke=False)
    doc.setFillColor(colors.white)
    doc.setFont("Helvetica-Bold", 20)
    doc.drawString(20 * mm, height - 15 * mm, account.get("business_name", "DocDuty"))
    doc.setFont("Helvetica", 11)
    doc.drawString(20 * mm, height - 22 * mm, "PAYMENT REMINDER")

    y = height - 45 * mm
    doc.setFillColor(colors.black)

    doc.setFont("Helvetica", 10)
    doc.drawString(20 * mm, y, f"Date: {date.today().isoformat()}")
    y -= 10 * mm
    doc.drawString(20 * mm, y, f"To: {invoice['bill_to_name']}")
    if invoice.get("bill_to_email"):
        y -= 6 * mm
        doc.drawString(20 * mm, y, invoice["bill_to_email"])

    y -= 20 * mm
    doc.setFont("Helvetica", 10)
    message = (
        f"This is a reminder that invoice {invoice['invoice_number']}, "
        f"issued on {invoice['issue_date']}, was due on {invoice['due_date']} "
        f"and is now {days_overdue} day(s) overdue."
    )
    doc.drawString(20 * mm, y, message[:95])

    y -= 15 * mm
    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(20 * mm, y, f"Amount Due: NGN {invoice['total_kobo'] / 100:,.2f}")

    y -= 15 * mm
    doc.setFont("Helvetica", 10)
    doc.drawString(20 * mm, y, "Please arrange payment at your earliest convenience.")
    y -= 8 * mm
    doc.drawString(20 * mm, y, "If payment has already been made, please disregard this notice.")

    y -= 20 * mm
    doc.setFont("Helvetica", 10)
    doc.drawString(20 * mm, y, "Regards,")
    y -= 6 * mm
    doc.setFont("Helvetica-Bold", 10)
    doc.drawString(20 * mm, y, account.get("business_name", ""))

    doc.setFont("Helvetica", 7)
    doc.setFillColor(colors.grey)
    doc.drawCentredString(width / 2, 15 * mm, "Generated with DocDuty — docduty.app")

    doc.save()
    buffer.seek(0)
    return buffer.read()

def generate_contract_pdf(rendered_body: str, template_name: str, account: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)

    styles = getSampleStyleSheet()
    disclaimer_style = ParagraphStyle(
        "Disclaimer", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#dc2626"),
        borderColor=colors.HexColor("#dc2626"), borderWidth=1, borderPadding=8, spaceAfter=12,
    )
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=15, spaceAfter=10)

    elements = []

    elements.append(Paragraph(
        "<b>Disclaimer:</b> This document was generated using a standard template and does not "
        "constitute legal advice. It has not been reviewed by a licensed attorney for your specific "
        "circumstances. Please consult a qualified legal professional before relying on this document.",
        disclaimer_style,
    ))
    elements.append(Spacer(1, 10 * mm))

    # Convert the rendered plain-text body into paragraphs, preserving blank-line breaks
    for paragraph_text in rendered_body.split("\n\n"):
        cleaned = paragraph_text.strip().replace("\n", "<br/>")
        if cleaned:
            elements.append(Paragraph(cleaned, body_style))

    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(
        f"Generated with DocDuty on behalf of {account.get('business_name', '')} — docduty.app",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=colors.grey),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
