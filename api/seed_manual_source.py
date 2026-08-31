"""
For sites that block automated scraping (Cloudflare, JavaScript-rendered
content). You manually copy the real, visible page text into a .txt file,
and this script registers the source and ingests that content into the
knowledge base — same pipeline as the automated scraper, just with a
human doing the fetching step instead of a bot.

Usage:
    python3 seed_manual_source.py "Source Name" "https://real-url.com" "AGENCY" content.txt
"""
import sys
from database import get_connection
from knowledge_base import ingest_source

if len(sys.argv) != 5:
    print("Usage: python3 seed_manual_source.py \"Source Name\" \"URL\" \"AGENCY\" content_file.txt")
    sys.exit(1)

name, url, agency, content_file = sys.argv[1:5]

with open(content_file, "r", encoding="utf-8") as f:
    text = f.read()

if len(text.strip()) < 100:
    print(f"Warning: content is only {len(text.strip())} characters — this seems too short to be real page content. Aborting.")
    sys.exit(1)

conn = get_connection()
cur = conn.cursor()

cur.execute("SELECT id FROM regulatory_sources WHERE url = %s", (url,))
existing = cur.fetchone()

if existing:
    source_id = existing["id"]
    print(f"Source already exists (id={source_id}), re-ingesting with new content")
else:
    cur.execute(
        "INSERT INTO regulatory_sources (name, url, agency) VALUES (%s, %s, %s) RETURNING id",
        (name, url, agency),
    )
    source_id = cur.fetchone()["id"]
    conn.commit()
    print(f"Created new source (id={source_id})")

cur.close()
conn.close()

chunk_count = ingest_source(source_id, text)
print(f"Ingested {chunk_count} chunks from '{name}'")
