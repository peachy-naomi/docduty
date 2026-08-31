from fastapi import Header, HTTPException
from jose import JWTError
from auth_utils import decode_jwt


def get_current_user_id(authorization: str = Header(None), token: str = None) -> int:
    raw_token = None

    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0] == "Bearer":
            raw_token = parts[1]

    if not raw_token and token:
        raw_token = token

    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing authorization")

    try:
        payload = decode_jwt(raw_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload["user_id"]
