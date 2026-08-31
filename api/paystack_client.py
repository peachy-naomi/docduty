import os
import requests

BASE_URL = "https://api.paystack.co"


def _headers():
    return {"Authorization": f"Bearer {os.environ.get('DOCDUTY_PAYSTACK_SECRET_KEY')}"}


def initialize_subscription(email: str, plan_code: str, callback_url: str) -> dict:
    """
    Starts a subscription checkout. Paystack handles collecting the card and
    setting up recurring billing on their end — we just need to send the user
    to the returned authorization_url.
    """
    response = requests.post(
        f"{BASE_URL}/transaction/initialize",
        headers=_headers(),
        json={"email": email, "plan": plan_code, "callback_url": callback_url},
    )
    response.raise_for_status()
    return response.json()["data"]


def verify_transaction(reference: str) -> dict:
    response = requests.get(f"{BASE_URL}/transaction/verify/{reference}", headers=_headers())
    response.raise_for_status()
    return response.json()["data"]
