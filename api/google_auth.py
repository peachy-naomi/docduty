import os
import secrets
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from database import get_connection
from auth_utils import create_jwt

router = APIRouter()


class GoogleAuthInput(BaseModel):
    credential: str  # the ID token Google's sign-in button returns
    account_type: str | None = None  # only needed for brand-new signups
    business_name: str | None = None


@router.post("/auth/google")
def google_auth(input: GoogleAuthInput):
    client_id = os.environ.get("GOOGLE_CLIENT_ID")

    try:
        # This call itself verifies the token was genuinely issued by Google
        # for OUR app specifically — rejects forged or mismatched tokens
        idinfo = id_token.verify_oauth2_token(input.credential, google_requests.Request(), client_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    google_id = idinfo["sub"]
    email = idinfo["email"]
    full_name = idinfo.get("name", email.split("@")[0])

    conn = get_connection()
    cur = conn.cursor()

    # Case 1: this Google account has signed in before — log them in directly
    cur.execute("SELECT id FROM users WHERE google_id = %s", (google_id,))
    existing = cur.fetchone()
    if existing:
        cur.close()
        conn.close()
        token = create_jwt(existing["id"])
        return {"token": token, "is_new_user": False}

    # Case 2: an account with this email already exists via password signup —
    # link the Google ID to it rather than creating a confusing duplicate
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing_email = cur.fetchone()
    if existing_email:
        cur.execute("UPDATE users SET google_id = %s, email_verified = TRUE WHERE id = %s", (google_id, existing_email["id"]))
        conn.commit()
        cur.close()
        conn.close()
        token = create_jwt(existing_email["id"])
        return {"token": token, "is_new_user": False}

    # Case 3: genuinely new user — create both the user and their account.
    # Google already verified this email is real, so we mark it verified
    # immediately and skip the usual email-confirmation step entirely.
    if not input.account_type or not input.business_name:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="account_type and business_name are required for new signups")

    cur.execute(
        """
        INSERT INTO users (email, password_hash, full_name, email_verified, google_id)
        VALUES (%s, %s, %s, TRUE, %s) RETURNING id
        """,
        (email, secrets.token_hex(32), full_name, google_id),
        # password_hash gets a random, unusable value — this account can only
        # ever log in via Google, never via a password, since none was set
    )
    user_id = cur.fetchone()["id"]

    cur.execute(
        "INSERT INTO accounts (owner_user_id, account_type, business_name) VALUES (%s, %s, %s) RETURNING id",
        (user_id, input.account_type, input.business_name),
    )
    account_id = cur.fetchone()["id"]

    cur.execute(
        "INSERT INTO clients (account_id, business_name) VALUES (%s, %s)",
        (account_id, input.business_name),
    )

    conn.commit()
    cur.close()
    conn.close()

    token = create_jwt(user_id)
    return {"token": token, "is_new_user": True}
