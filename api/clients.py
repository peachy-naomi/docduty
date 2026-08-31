from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user

router = APIRouter()


class ClientInput(BaseModel):
    business_name: str
    contact_email: str | None = None
    contact_phone: str | None = None
    address: str | None = None


def list_clients_internal(account_id: int) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, business_name, contact_email, contact_phone, address, created_at FROM clients WHERE account_id = %s ORDER BY created_at DESC",
        (account_id,),
    )
    clients = cur.fetchall()
    cur.close()
    conn.close()
    return {"clients": clients}


@router.get("/clients")
def list_clients(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    return list_clients_internal(account["id"])


@router.post("/clients")
def create_client(input: ClientInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    if account["account_type"] != "agency":
        raise HTTPException(
            status_code=403,
            detail="Only agency accounts can add multiple clients. Individual accounts operate on their own business only.",
        )

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO clients (account_id, business_name, contact_email, contact_phone, address)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (account["id"], input.business_name, input.contact_email, input.contact_phone, input.address),
    )
    client_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Client added successfully", "client_id": client_id}


@router.get("/clients/{client_id}")
def get_client(client_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, business_name, contact_email, contact_phone, address, created_at FROM clients WHERE id = %s AND account_id = %s",
        (client_id, account["id"]),
    )
    client = cur.fetchone()
    cur.close()
    conn.close()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return client


@router.put("/clients/{client_id}")
def update_client(client_id: int, input: ClientInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE clients SET business_name = %s, contact_email = %s, contact_phone = %s, address = %s
        WHERE id = %s AND account_id = %s RETURNING id
        """,
        (input.business_name, input.contact_email, input.contact_phone, input.address, client_id, account["id"]),
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Client not found")

    return {"message": "Client updated successfully"}
