import io
import hashlib
from typing import Tuple
from sqlalchemy.orm import Session
from app.models.entities import AttachmentsTextCache

def extract_text_from_file(file_bytes: bytes, filename: str, db: Session) -> Tuple[str, int, str]:
    """
    Extracts text from uploaded PDF or plain text documents.
    Returns (extracted_text, page_count, sha256_hash).
    Caches in attachments_text_cache.
    """
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    
    # Check cache first
    cached = db.query(AttachmentsTextCache).filter(AttachmentsTextCache.file_hash == file_hash).first()
    if cached:
        return cached.extracted_text, cached.page_count, file_hash

    lower_name = filename.lower()
    extracted_text = ""
    page_count = 1

    if lower_name.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_text.append(f"--- PAGE {i+1} ---\n{text}")
            extracted_text = "\n\n".join(pages_text)
        except Exception as e:
            extracted_text = f"Failed to extract PDF text: {str(e)}"
    else:
        # Plain text / Markdown / CSV
        try:
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("latin-1", errors="replace")

    # Cache result
    cache_record = AttachmentsTextCache(
        file_name=filename,
        file_hash=file_hash,
        extracted_text=extracted_text,
        page_count=page_count
    )
    db.add(cache_record)
    db.commit()

    return extracted_text, page_count, file_hash

