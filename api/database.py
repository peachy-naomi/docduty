import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DOCDUTY_PG_HOST"),
        port=os.environ.get("DOCDUTY_PG_PORT"),
        dbname=os.environ.get("DOCDUTY_DB"),
        user=os.environ.get("DOCDUTY_PG_USER"),
        password=os.environ.get("DOCDUTY_PG_PASSWORD"),
        cursor_factory=RealDictCursor,
    )
