from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from deadline_reminders import send_deadline_reminders

router = APIRouter()


class DeadlineInput(BaseModel):
    client_id: int
    deadline_type: str
    description: str | None = None
    due_date: date
    recurrence: str = "none"
    reminder_days_before: int = 30


def list_deadlines_internal(account_id: int) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT d.id, d.deadline_type, d.description, d.due_date, d.recurrence,
               d.completed, c.business_name as client_name,
               (d.due_date - CURRENT_DATE) as days_remaining
        FROM compliance_deadlines d JOIN clients c ON c.id = d.client_id
        WHERE d.account_id = %s AND d.completed = FALSE
        ORDER BY d.due_date ASC
        """,
        (account_id,),
    )
    deadlines = cur.fetchall()
    cur.close()
    conn.close()

    for d in deadlines:
        d["days_remaining"] = int(d["days_remaining"]) if d["days_remaining"] is not None else None

    return {"deadlines": deadlines}


@router.post("/deadlines")
def create_deadline(input: DeadlineInput, user_id: int = Depends(get_current_user_id)):
    if input.recurrence not in ("none", "monthly", "quarterly", "annually"):
        raise HTTPException(status_code=400, detail="Invalid recurrence value")

    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM clients WHERE id = %s AND account_id = %s", (input.client_id, account["id"]))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Client not found")

    cur.execute(
        """
        INSERT INTO compliance_deadlines (account_id, client_id, deadline_type, description, due_date, recurrence, reminder_days_before)
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (account["id"], input.client_id, input.deadline_type, input.description, input.due_date, input.recurrence, input.reminder_days_before),
    )
    deadline_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Deadline created successfully", "deadline_id": deadline_id}


@router.get("/deadlines")
def list_deadlines(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    return list_deadlines_internal(account["id"])


def calculate_next_due_date(current_due_date: date, recurrence: str) -> date:
    if recurrence == "monthly":
        return add_months(current_due_date, 1)
    elif recurrence == "quarterly":
        return add_months(current_due_date, 3)
    elif recurrence == "annually":
        return add_months(current_due_date, 12)
    return current_due_date


def add_months(source_date: date, months: int) -> date:
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    day = min(source_date.day, 28)
    return date(year, month, day)


@router.put("/deadlines/{deadline_id}/complete")
def mark_complete(deadline_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT recurrence, due_date, deadline_type, description, client_id, reminder_days_before FROM compliance_deadlines WHERE id = %s AND account_id = %s",
        (deadline_id, account["id"]),
    )
    deadline = cur.fetchone()
    if not deadline:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Deadline not found")

    cur.execute("UPDATE compliance_deadlines SET completed = TRUE WHERE id = %s", (deadline_id,))

    if deadline["recurrence"] != "none":
        next_due_date = calculate_next_due_date(deadline["due_date"], deadline["recurrence"])
        cur.execute(
            """
            INSERT INTO compliance_deadlines (account_id, client_id, deadline_type, description, due_date, recurrence, reminder_days_before)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (account["id"], deadline["client_id"], deadline["deadline_type"], deadline["description"],
             next_due_date, deadline["recurrence"], deadline["reminder_days_before"]),
        )

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Deadline marked complete"}


@router.post("/admin/deadlines/send-reminders")
def trigger_reminders(user_id: int = Depends(get_current_user_id)):
    from rate_tables import require_admin
    require_admin(user_id)
    result = send_deadline_reminders()
    return result
