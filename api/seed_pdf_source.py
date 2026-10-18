"""
Ingests a PDF document into the knowledge base. For regulatory PDFs
(gazettes, official guidance documents, downloaded circulars) that can't
be scraped as a webpage — you download the PDF yourself, then run this
to extract its text and feed it into the same chunking/embedding
pipeline as every other source.

Usage:
    python3 seed_pdf_source.py "Source Name" "https://original-url-or-local-note" "AGENCY" document.pdf
"""
import sys
from pypdf import PdfReader
from database import get_connection
from knowledge_base import ingest_source

if len(sys.argv) != 5:
    print("Usage: python3 seed_pdf_source.py \"Source Name\" \"URL\" \"AGENCY\" document.pdf")
    sys.exit(1)

name, url, agency, pdf_path = sys.argv[1:5]

print(f"Reading {pdf_path}...")
reader = PdfReader(pdf_path)
text_parts = []
for i, page in enumerate(reader.pages):
    page_text = page.extract_text()
    if page_text:
        text_parts.append(page_text)
    else:
        print(f"  Warning: page {i + 1} produced no extractable text (likely a scanned image, not real text)")

full_text = "\n\n".join(text_parts)

if len(full_text.strip()) < 200:
    print(f"Warning: only extracted {len(full_text.strip())} characters total.")
    print("This usually means the PDF is a scanned image rather than real text — pypdf can't")
    print("read text from an image. You'd need OCR (a different tool) for that kind of file.")
    confirm = input("Continue anyway with this small amount of text? (y/n): ")
    if confirm.lower() != "y":
        sys.exit(1)

print(f"Extracted {len(full_text)} characters from {len(reader.pages)} pages")

conn = get_connection()
cur = conn.cursor()

cur.execute("SELECT id FROM regulatory_sources WHERE url = %s", (url,))
existing = cur.fetchone()

if existing:
    source_id = existing["id"]
    print(f"Source already exists (id={source_id}), re-ingesting with updated content")
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

chunk_count = ingest_source(source_id, full_text)
print(f"Ingested {chunk_count} chunks from '{name}'")
