import os
import bcrypt
from datetime import datetime, timedelta
from jose import jwt


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_jwt(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, os.environ.get("JWT_SECRET"), algorithm="HS256")


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, os.environ.get("JWT_SECRET"), algorithms=["HS256"])
