from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user

router = APIRouter()


class ProfileUpdateInput(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    business_name: str | None = None
    logo_url: str | None = None
    brand_color: str | None = None


@router.get("/profile")
def get_profile(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT email, full_name, phone_number FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()

    cur.execute("SELECT logo_url, brand_color FROM accounts WHERE id = %s", (account["id"],))
    account_extra = cur.fetchone()
    cur.close()
    conn.close()

    return {
        "email": user["email"],
        "full_name": user["full_name"],
        "phone_number": user["phone_number"],
        "account_type": account["account_type"],
        "business_name": account["business_name"],
        "subscription_status": account["subscription_status"],
        "logo_url": account_extra["logo_url"],
        "brand_color": account_extra["brand_color"],
    }


@router.put("/profile")
def update_profile(input: ProfileUpdateInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()

    if input.full_name is not None:
        cur.execute("UPDATE users SET full_name = %s WHERE id = %s", (input.full_name, user_id))
    if input.phone_number is not None:
        cur.execute("UPDATE users SET phone_number = %s WHERE id = %s", (input.phone_number, user_id))
    if input.business_name is not None:
        cur.execute("UPDATE accounts SET business_name = %s WHERE id = %s", (input.business_name, account["id"]))
    if input.logo_url is not None:
        cur.execute("UPDATE accounts SET logo_url = %s WHERE id = %s", (input.logo_url, account["id"]))
    if input.brand_color is not None:
        cur.execute("UPDATE accounts SET brand_color = %s WHERE id = %s", (input.brand_color, account["id"]))
    
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Profile updated successfully"}
