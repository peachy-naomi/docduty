import re
from sentence_transformers import SentenceTransformer
from database import get_connection
from pgvector.psycopg2 import register_vector


# Loaded once at import time — reused across every request, since loading
# the model itself takes a couple of seconds and shouldn't happen per-call
_model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_text(text: str) -> list[float]:
    return _model.encode(text).tolist()


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """
    Splits long text into overlapping chunks. Overlap matters here — without
    it, a sentence that spans exactly where we cut could lose meaning on
    both sides. Chunking on character count, filtering out fragments too
    short to be meaningful on their own.
    """
    text = re.sub(r"\s+", " ", text).strip()
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return [c for c in chunks if len(c.strip()) > 50]


def ingest_source(source_id: int, raw_text: str) -> int:
    """
    Chunks and embeds a source's text, storing each chunk. Deletes any
    previous chunks for this source first, so re-scraping a page cleanly
    replaces outdated content rather than accumulating duplicates forever.
    """
    chunks = chunk_text(raw_text)

    conn = get_connection()
    register_vector(conn)
    cur = conn.cursor()

def search_knowledge(query: str, top_k: int = 5) -> list[dict]:
    """
    The actual retrieval step: embeds the query, finds the most semantically
    similar stored chunks using cosine distance (<=> is pgvector's cosine
    distance operator — smaller means more similar).
    """
    import numpy as np
    query_embedding = np.array(embed_text(query))

    conn = get_connection()
    register_vector(conn)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT kc.content, rs.name as source_name, rs.agency, rs.url,
               1 - (kc.embedding <=> %s) as similarity
        FROM knowledge_chunks kc
        JOIN regulatory_sources rs ON rs.id = kc.source_id
        ORDER BY kc.embedding <=> %s
        LIMIT %s
        """,
        (query_embedding, query_embedding, top_k),
    )
    results = cur.fetchall()
    cur.close()
    conn.close()

    return results
