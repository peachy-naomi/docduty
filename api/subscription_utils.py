from fastapi import HTTPException
from database import get_connection

FREE_TIER_MONTHLY_DOCUMENT_LIMIT = 5


def check_subscription_active(account: dict) -> bool:
    return account.get("subscription_status") == "active"


def enforce_document_limit(account_id: int, account: dict) -> None:
    """
    Call this before creating any billable document (invoice, contract, etc.).
    Active subscribers pass through with no limit. Free-tier accounts are
    capped at a fixed number of documents per calendar month.
    """
    if check_subscription_active(account):
        return

    conn = get_connection()
    cur = conn.cursor()

    # Count everything generated this calendar month, across invoices AND contracts
    cur.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM invoices WHERE account_id = %s AND created_at >= date_trunc('month', CURRENT_DATE)) +
            (SELECT COUNT(*) FROM contracts WHERE account_id = %s AND created_at >= date_trunc('month', CURRENT_DATE))
        AS total_count
        """,
        (account_id, account_id),
    )
    count = cur.fetchone()["total_count"]
    cur.close()
    conn.close()

    if count >= FREE_TIER_MONTHLY_DOCUMENT_LIMIT:
        raise HTTPException(
            status_code=402,
            detail=f"Free tier limit of {FREE_TIER_MONTHLY_DOCUMENT_LIMIT} documents per month reached. Upgrade your subscription to continue.",
        )
