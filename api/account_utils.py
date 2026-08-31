from fastapi import HTTPException
from database import get_connection


def get_account_for_user(user_id: int) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, account_type, business_name, plan, subscription_status, subscription_expires_at, logo_url, brand_color, onboarding_completed, state, monthly_revenue_range, staff_salary_range, legal_structure, business_description, staff_size_range, office_status FROM accounts WHERE owner_user_id = %s",
        (user_id,),
    )
    account = cur.fetchone()
    cur.close()
    conn.close()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return account
