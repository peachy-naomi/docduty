from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection
from auth import router as auth_router
from clients import router as clients_router
from rate_tables import router as rate_tables_router
from invoices import router as invoices_router
from reminders import router as reminders_router
from contracts import router as contracts_router
from calculators import router as calculators_router
from deadlines import router as deadlines_router
from billing import router as billing_router
from chat import router as chat_router
from invoice_payments import router as invoice_payments_router
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from user_profile import router as profile_router
from admin_panel import router as admin_panel_router
from google_auth import router as google_auth_router
from health_score import router as health_score_router
from document_verification import router as verification_router

app = FastAPI(title="DocDuty API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(rate_tables_router)
app.include_router(invoices_router)
app.include_router(reminders_router)
app.include_router(contracts_router)
app.include_router(calculators_router)
app.include_router(deadlines_router)
app.include_router(billing_router)
app.include_router(chat_router)
app.include_router(invoice_payments_router)
app.include_router(profile_router)
app.include_router(admin_panel_router)
app.include_router(google_auth_router)
app.include_router(health_score_router)
app.include_router(verification_router)

@app.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.execute(
        "SELECT id, account_type, business_name, plan, subscription_status, subscription_expires_at FROM accounts WHERE owner_user_id = %s",
        (user_id,),
    )
    account = cur.fetchone()
    cur.close()
    conn.close()

    return {"user_id": user_id, "account": account, "is_admin": user["is_admin"]}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/db")
def health_check_db():
    try:
        conn = get_connection()
        conn.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
