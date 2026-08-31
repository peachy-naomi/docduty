import os
import hmac
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from paystack_client import initialize_subscription, verify_transaction

router = APIRouter()

PLAN_CODES = {
    "individual": None,
    "agency": None,
}


def get_plan_code(account_type: str) -> str:
    env_key = "DOCDUTY_INDIVIDUAL_PLAN_CODE" if account_type == "individual" else "DOCDUTY_AGENCY_PLAN_CODE"
    code = os.environ.get(env_key)
    if not code:
        raise HTTPException(status_code=500, detail=f"No plan configured for account type '{account_type}'")
    return code


@router.post("/billing/subscribe")
def start_subscription(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
    email = cur.fetchone()["email"]
    cur.close()
    conn.close()

    plan_code = get_plan_code(account["account_type"])
    callback_url = f"{os.environ.get('APP_FRONTEND_URL')}/billing/success"

    result = initialize_subscription(email, plan_code, callback_url)

    return {"payment_url": result["authorization_url"], "reference": result["reference"]}


@router.get("/billing/verify")
def verify_subscription(reference: str, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    data = verify_transaction(reference)

    if data["status"] != "success":
        raise HTTPException(status_code=400, detail="Payment was not successful")

    subscription_code = data.get("plan_object", {}).get("plan_code") and data.get("authorization", {}).get("authorization_code")
    customer_code = data.get("customer", {}).get("customer_code")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE accounts SET paystack_customer_code = %s, subscription_status = 'active',
        subscription_expires_at = %s WHERE id = %s
        """,
        (customer_code, datetime.utcnow() + timedelta(days=31), account["id"]),
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Subscription activated successfully", "status": "active"}


@router.get("/billing/status")
def billing_status(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT subscription_status, subscription_expires_at FROM accounts WHERE id = %s",
        (account["id"],),
    )
    result = cur.fetchone()
    cur.close()
    conn.close()

    return result


def verify_paystack_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        os.environ.get("DOCDUTY_PAYSTACK_SECRET_KEY").encode("utf-8"),
        body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/paystack")
async def paystack_webhook(request: Request):
    """
    Handles ongoing subscription events (renewal charges, cancellations)
    that happen after the initial signup — keeps our local subscription
    status in sync without the user needing to be actively on the site.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if not signature or not verify_paystack_signature(raw_body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event = payload.get("event")

    if event == "subscription.disable":
        customer_code = payload["data"]["customer"]["customer_code"]
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE accounts SET subscription_status = 'cancelled' WHERE paystack_customer_code = %s",
            (customer_code,),
        )
        conn.commit()
        cur.close()
        conn.close()

    elif event == "charge.success" and payload["data"].get("plan"):
        # A recurring renewal charge succeeded — extend the expiry
        customer_code = payload["data"]["customer"]["customer_code"]
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE accounts SET subscription_status = 'active',
            subscription_expires_at = %s WHERE paystack_customer_code = %s
            """,
            (datetime.utcnow() + timedelta(days=31), customer_code),
        )
        conn.commit()
        cur.close()
        conn.close()

    return {"status": "received"}
