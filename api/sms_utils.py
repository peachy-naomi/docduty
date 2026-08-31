import os
import requests


def send_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS via Termii. Returns True/False rather than raising, since
    reminder sending should degrade gracefully — a failed SMS shouldn't
    crash the whole reminder batch (same resilience pattern as the email
    reminder loop).
    """
    api_key = os.environ.get("TERMII_API_KEY")
    if not api_key:
        print("Termii API key not configured, skipping SMS")
        return False

    try:
        response = requests.post(
            "https://api.ng.termii.com/api/sms/send",
            json={
                "to": phone_number,
                "from": os.environ.get("TERMII_SENDER_ID", "DocDuty"),
                "sms": message,
                "type": "plain",
                "channel": "generic",
                "api_key": api_key,
            },
            timeout=10,
        )
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Failed to send SMS to {phone_number}: {e}")
        return False
