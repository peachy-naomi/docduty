import os
import resend

APP_FRONTEND_URL = os.environ.get("APP_FRONTEND_URL", "")


def build_branded_email(body_html: str, body_text: str) -> tuple[str, str]:
    """
    Wraps any email content in a consistent DocDuty header and footer —
    used across every outgoing email so the brand is genuinely consistent,
    not ad-hoc per message.
    """
    html = f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FFFFFF;">
      <div style="background: linear-gradient(135deg, #1a0b2e, #2d1155); padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <span style="font-size: 20px; font-weight: 700; color: #FFFFFF;">DocDuty</span>
      </div>
      <div style="padding: 32px; border-left: 1px solid #EDE9FE; border-right: 1px solid #EDE9FE; color: #1A1A1A; font-size: 14px; line-height: 1.6;">
        {body_html}
      </div>
      <div style="padding: 24px 32px; border: 1px solid #EDE9FE; border-top: none; border-radius: 0 0 12px 12px; background: #FAFAFA;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;">
          DocDuty helps Nigerian businesses handle compliance and documentation, grounded in real regulatory data.
        </p>
        <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
          You're receiving this because you have a DocDuty account. This is not a substitute for licensed legal or accounting advice.
        </p>
      </div>
    </div>
    """

    text = f"{body_text}\n\n---\nDocDuty — compliance and documentation for Nigerian businesses.\nThis is not a substitute for licensed legal or accounting advice."

    return html, text


def send_verification_email(to_email: str, full_name: str, token: str):
    resend.api_key = os.environ.get("DOCDUTY_RESEND_API_KEY")

    verify_link = f"{APP_FRONTEND_URL}/verify-email?token={token}"
    first_name = full_name.split(" ")[0]

    body_html = f"""
      <p>Hi {first_name},</p>
      <p>Thanks for signing up for DocDuty. Please confirm your email address to activate your account and start generating invoices, contracts, and compliance documents for your business.</p>
      <p style="margin: 24px 0;">
        <a href="{verify_link}" style="display: inline-block; background: #7c3aed; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Verify My Email
        </a>
      </p>
      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;"><a href="{verify_link}" style="color: #7c3aed;">{verify_link}</a></p>
      <p>This link expires in 24 hours. If you didn't create a DocDuty account, you can safely ignore this email.</p>
    """

    body_text = (
        f"Hi {first_name},\n\n"
        f"Thanks for signing up for DocDuty. Please confirm your email address to activate your account:\n\n"
        f"{verify_link}\n\n"
        f"This link expires in 24 hours. If you didn't create a DocDuty account, you can safely ignore this email."
    )

    html_body, text_body = build_branded_email(body_html, body_text)

    resend.Emails.send({
        "from": "DocDuty <info@peachidevlab.site>",
        "to": to_email,
        "subject": f"{first_name}, confirm your DocDuty account",
        "html": html_body,
        "text": text_body,
    })

def send_password_reset_email(to_email: str, full_name: str, token: str):
    resend.api_key = os.environ.get("DOCDUTY_RESEND_API_KEY")

    reset_link = f"{APP_FRONTEND_URL}/reset-password?token={token}"
    first_name = full_name.split(" ")[0] if full_name else "there"

    body_html = f"""
      <p>Hi {first_name},</p>
      <p>We received a request to reset your DocDuty password. Click below to choose a new one:</p>
      <p style="margin: 24px 0;">
        <a href="{reset_link}" style="display: inline-block; background: #7c3aed; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset My Password
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;"><a href="{reset_link}" style="color: #7c3aed;">{reset_link}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    """

    body_text = (
        f"Hi {first_name},\n\n"
        f"We received a request to reset your DocDuty password. Use this link to choose a new one:\n\n"
        f"{reset_link}\n\n"
        f"This link expires in 1 hour. If you didn't request this, you can safely ignore this email."
    )

    html_body, text_body = build_branded_email(body_html, body_text)

    resend.Emails.send({
        "from": "DocDuty <info@peachidevlab.site>",
        "to": to_email,
        "subject": "Reset your DocDuty password",
        "html": html_body,
        "text": text_body,
    })
