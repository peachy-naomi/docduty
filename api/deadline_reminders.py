from datetime import date, datetime
from database import get_connection
from sms_utils import send_sms
import resend
import os


def send_deadline_reminders():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT d.id, d.deadline_type, d.description, d.due_date, d.reminder_days_before,
               d.last_reminder_sent_at, c.business_name as client_name,
               u.email as owner_email, u.full_name as owner_name, u.phone_number as owner_phone
        FROM compliance_deadlines d
        JOIN clients c ON c.id = d.client_id
        JOIN accounts a ON a.id = d.account_id
        JOIN users u ON u.id = a.owner_user_id
        WHERE d.completed = FALSE
        """
    )
    deadlines = cur.fetchall()

    sent_count = 0
    for deadline in deadlines:
        days_until_due = (deadline["due_date"] - date.today()).days

        already_sent_today = (
            deadline["last_reminder_sent_at"] is not None
            and deadline["last_reminder_sent_at"].date() == date.today()
        )

        should_send = (
            0 <= days_until_due <= deadline["reminder_days_before"]
            and not already_sent_today
        )

        if should_send:
            email_sent = False
            try:
                _send_reminder_email(deadline, days_until_due)
                email_sent = True
            except Exception as e:
                print(f"Failed to send reminder email for deadline {deadline['id']}: {e}")

            sms_sent = False
            if deadline["owner_phone"]:
                urgency = "today" if days_until_due == 0 else f"in {days_until_due} day(s)"
                sms_message = f"DocDuty: {deadline['deadline_type']} for {deadline['client_name']} is due {urgency} ({deadline['due_date']})."
                sms_sent = send_sms(deadline["owner_phone"], sms_message)

            if email_sent or sms_sent:
                cur.execute(
                    "UPDATE compliance_deadlines SET last_reminder_sent_at = %s WHERE id = %s",
                    (datetime.utcnow(), deadline["id"]),
                )
                sent_count += 1

    conn.commit()
    cur.close()
    conn.close()

    return {"reminders_sent": sent_count}


def _send_reminder_email(deadline: dict, days_until_due: int):
    from email_utils import build_branded_email

    resend.api_key = os.environ.get("DOCDUTY_RESEND_API_KEY")

    urgency = "today" if days_until_due == 0 else f"in {days_until_due} day(s)"
    first_name = deadline["owner_name"].split(" ")[0]

    body_html = f"""
      <p>Hi {first_name},</p>
      <p>This is a reminder that <strong>{deadline['deadline_type']}</strong> for
      <strong>{deadline['client_name']}</strong> is due {urgency} ({deadline['due_date']}).</p>
      {f"<p>{deadline['description']}</p>" if deadline['description'] else ""}
      <p>Log in to DocDuty to mark this complete once handled.</p>
    """

    body_text = (
        f"Hi {first_name},\n\n"
        f"This is a reminder that {deadline['deadline_type']} for {deadline['client_name']} "
        f"is due {urgency} ({deadline['due_date']}).\n\n"
        f"Log in to DocDuty to mark this complete once handled."
    )

    html_body, text_body = build_branded_email(body_html, body_text)

    resend.Emails.send({
        "from": "DocDuty <info@peachidevlab.site>",
        "to": deadline["owner_email"],
        "subject": f"Reminder: {deadline['deadline_type']} due {urgency}",
        "html": html_body,
        "text": text_body,
    })
