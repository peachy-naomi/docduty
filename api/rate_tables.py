from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extras import Json
from database import get_connection
from dependencies import get_current_user_id

router = APIRouter()


def require_admin(user_id: int) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")


def get_current_rate(rate_type: str, as_of: date = None) -> dict:
    as_of = as_of or date.today()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, rate_data, effective_date, notes FROM rate_tables
        WHERE rate_type = %s AND effective_date <= %s
        ORDER BY effective_date DESC LIMIT 1
        """,
        (rate_type, as_of),
    )
    rate = cur.fetchone()
    cur.close()
    conn.close()

    if not rate:
        raise HTTPException(status_code=404, detail=f"No rate configured for '{rate_type}'")

    return rate


class RateInput(BaseModel):
    rate_type: str
    rate_data: dict
    effective_date: date
    notes: str | None = None


@router.get("/rates/{rate_type}")
def get_rate(rate_type: str, user_id: int = Depends(get_current_user_id)):
    return get_current_rate(rate_type)


@router.get("/rates/{rate_type}/history")
def get_rate_history(rate_type: str, user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, rate_data, effective_date, notes, created_at FROM rate_tables WHERE rate_type = %s ORDER BY effective_date DESC",
        (rate_type,),
    )
    history = cur.fetchall()
    cur.close()
    conn.close()

    return {"history": history}

@router.get("/admin/rate-alerts")
def list_rate_alerts(user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT a.id, a.detected_at, a.reviewed, a.reviewed_at, a.notes,
               s.rate_type, s.source_name, s.url
        FROM rate_change_alerts a
        JOIN watched_sources s ON s.id = a.watched_source_id
        ORDER BY a.detected_at DESC
        """
    )
    alerts = cur.fetchall()
    cur.close()
    conn.close()
    return {"alerts": alerts}


@router.put("/admin/rate-alerts/{alert_id}/review")
def review_rate_alert(alert_id: int, user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rate_change_alerts SET reviewed = TRUE, reviewed_at = NOW() WHERE id = %s RETURNING id",
        (alert_id,),
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"message": "Alert marked as reviewed"}


@router.get("/admin/watched-sources")
def list_watched_sources(user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, rate_type, source_name, url, last_checked_at, active FROM watched_sources ORDER BY rate_type")
    sources = cur.fetchall()
    cur.close()
    conn.close()
    return {"sources": sources}

@router.post("/admin/rates")
def create_rate(input: RateInput, user_id: int = Depends(get_current_user_id)):
    require_admin(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO rate_tables (rate_type, rate_data, effective_date, notes, created_by)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (input.rate_type, Json(input.rate_data), input.effective_date, input.notes, user_id),
    )
    rate_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Rate created successfully", "rate_id": rate_id}
