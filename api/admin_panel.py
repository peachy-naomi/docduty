from fastapi import APIRouter, Depends
from database import get_connection
from dependencies import get_current_user_id
from rate_tables import require_admin

router = APIRouter()


@router.get("/admin/users")
def list_all_users(user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.id, u.email, u.full_name, u.email_verified, u.is_admin, u.created_at,
               a.id as account_id, a.account_type, a.business_name,
               a.subscription_status, a.subscription_expires_at
        FROM users u
        LEFT JOIN accounts a ON a.owner_user_id = u.id
        ORDER BY u.created_at DESC
        """
    )
    users = cur.fetchall()
    cur.close()
    conn.close()

    return {"users": users}


@router.get("/admin/audit-log")
def get_audit_log(user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT i.id, i.invoice_number as reference, i.document_type, i.total_kobo, i.created_at,
               a.business_name as account_name, u.email as account_email
        FROM invoices i
        JOIN accounts a ON a.id = i.account_id
        JOIN users u ON u.id = a.owner_user_id
        ORDER BY i.created_at DESC
        LIMIT 100
        """
    )
    invoices = cur.fetchall()

    cur.execute(
        """
        SELECT c.id, ct.name as reference, 'contract' as document_type, NULL as total_kobo, c.created_at,
               a.business_name as account_name, u.email as account_email
        FROM contracts c
        JOIN contract_templates ct ON ct.id = c.template_id
        JOIN accounts a ON a.id = c.account_id
        JOIN users u ON u.id = a.owner_user_id
        ORDER BY c.created_at DESC
        LIMIT 100
        """
    )
    contracts = cur.fetchall()

    cur.close()
    conn.close()

    combined = list(invoices) + list(contracts)
    combined.sort(key=lambda x: x["created_at"], reverse=True)

    return {"entries": combined[:100]}
