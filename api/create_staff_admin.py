"""
One-off script to create a genuine staff-only admin account — no business,
no client, no personal dashboard. Run this manually whenever you need to
add a new staff/admin identity.
"""
from database import get_connection
from auth_utils import hash_password

STAFF_EMAIL = "admin@peachidevlab.site"
STAFF_PASSWORD = "ChangeThisImmediately123"
STAFF_NAME = "DocDuty Staff"

conn = get_connection()
cur = conn.cursor()

password_hash = hash_password(STAFF_PASSWORD)

cur.execute(
    """
    INSERT INTO users (email, password_hash, full_name, email_verified, is_admin)
    VALUES (%s, %s, %s, TRUE, TRUE)
    RETURNING id
    """,
    (STAFF_EMAIL, password_hash, STAFF_NAME),
)
user_id = cur.fetchone()["id"]

conn.commit()
cur.close()
conn.close()

print(f"Staff admin account created: {STAFF_EMAIL} (user_id={user_id})")
print(f"Password: {STAFF_PASSWORD} — change this after first login")
