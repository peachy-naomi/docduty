import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database import get_connection
from auth_utils import hash_password, verify_password, create_jwt
from email_utils import send_verification_email, send_password_reset_email

router = APIRouter()


class SignupInput(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    account_type: str
    business_name: str


@router.post("/signup")
def signup(input: SignupInput):
    if input.account_type not in ("individual", "agency"):
        raise HTTPException(status_code=400, detail="account_type must be 'individual' or 'agency'")
    if len(input.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    conn = get_connection()
    cur = conn.cursor()

    password_hash = hash_password(input.password)
    verification_token = secrets.token_hex(32)
    token_expiry = datetime.utcnow() + timedelta(hours=24)

    try:
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name, verification_token, verification_token_expires)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
            """,
            (input.email, password_hash, input.full_name, verification_token, token_expiry),
        )
        user_id = cur.fetchone()["id"]

        cur.execute(
            """
            INSERT INTO accounts (owner_user_id, account_type, business_name)
            VALUES (%s, %s, %s) RETURNING id
            """,
            (user_id, input.account_type, input.business_name),
        )
        account_id = cur.fetchone()["id"]

        cur.execute(
            """
            INSERT INTO clients (account_id, business_name)
            VALUES (%s, %s)
            """,
            (account_id, input.business_name),
        )

        conn.commit()
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    finally:
        cur.close()
        conn.close()

    send_verification_email(input.email, input.full_name, verification_token)

    return {"message": "Account created. Please verify your email.", "user_id": user_id}


@router.get("/verify-email")
def verify_email(token: str):
    conn = get_connection()
    cur = conn.cursor()

    # Look up by token WITHOUT requiring it be unused — this lets us tell the
    # difference between "genuinely invalid token" and "already verified,
    # clicked the link again", which is a completely normal thing users do
    cur.execute(
        "SELECT id, email_verified, verification_token_expires FROM users WHERE verification_token = %s",
        (token,),
    )
    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if user["email_verified"]:
        cur.close()
        conn.close()
        return {"message": "Your email is already verified.", "already_verified": True}

    if user["verification_token_expires"] < datetime.utcnow():
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="This verification link has expired")

    cur.execute("UPDATE users SET email_verified = TRUE WHERE id = %s", (user["id"],))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Email verified successfully", "already_verified": False}


class LoginInput(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(input: LoginInput):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, password_hash, email_verified FROM users WHERE email = %s", (input.email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user["email_verified"]:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    token = create_jwt(user["id"])
    return {"message": "Login successful", "token": token}

class ForgotPasswordInput(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
def forgot_password(input: ForgotPasswordInput):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, full_name FROM users WHERE email = %s", (input.email,))
    user = cur.fetchone()

    if user:
        reset_token = secrets.token_hex(32)
        token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        cur.execute(
            "UPDATE users SET reset_token = %s, reset_token_expires = %s WHERE id = %s",
            (reset_token, token_expiry, user["id"]),
        )
        conn.commit()
        send_password_reset_email(input.email, user["full_name"], reset_token)

    cur.close()
    conn.close()

    # Always return the same message, whether or not the email exists —
    # this prevents leaking which emails are registered on the platform
    return {"message": "If that email is registered, a password reset link has been sent."}


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
def reset_password(input: ResetPasswordInput):
    if len(input.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM users WHERE reset_token = %s AND reset_token_expires > NOW() AT TIME ZONE 'UTC'",
        (input.token,),
    )
    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    new_hash = hash_password(input.new_password)
    cur.execute(
        "UPDATE users SET password_hash = %s, reset_token = NULL, reset_token_expires = NULL WHERE id = %s",
        (new_hash, user["id"]),
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Password reset successfully"}
