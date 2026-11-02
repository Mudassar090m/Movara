import logging
import os
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Document, DocumentChunk
from app.services import embedding_service, pdf_service

logger = logging.getLogger("studymate")
PDF_MAGIC = b"%PDF-"


class EmbedWarning(Exception):
    """Raised when a document was saved but embeddings could not be generated."""
    def __init__(self, message: str, document: "Document") -> None:
        super().__init__(message)
        self.document = document


def get_max_upload_bytes() -> int:
    return settings.max_upload_bytes


def _validate_upload(filename: str, contents: bytes) -> None:
    if not filename or not filename.lower().endswith(".pdf"):
        raise ValueError("Only .pdf files are allowed")
    if len(filename) > 255:
        raise ValueError("Filename is too long (max 255 characters)")
    if not contents.startswith(PDF_MAGIC):
        raise ValueError("The file is not a valid PDF (missing %PDF- header)")
    # Size is enforced by the route before this function is called.


def save_upload(
    db: Session,
    user_id: int,
    filename: str,
    contents: bytes,
    title: str | None,
) -> Document:
    _validate_upload(filename, contents)

    stored_filename = f"{uuid.uuid4().hex}.pdf"
    os.makedirs(settings.upload_dir, exist_ok=True)
    path = os.path.join(settings.upload_dir, stored_filename)
    with open(path, "wb") as f:
        f.write(contents)

    try:
        text = pdf_service.extract_text(path)
    except Exception:
        os.remove(path)
        raise ValueError("Could not extract text from the PDF")

    chunks = pdf_service.chunk_text(text)
    # Strip NUL bytes — PostgreSQL rejects \x00 in text columns.
    chunks = [c.replace("\x00", "") for c in chunks]

    # Embed all chunks in one batch call.
    chunk_texts = chunks
    embeddings: list[list[float] | None] = [None] * len(chunk_texts)
    embed_error: str | None = None
    try:
        if chunk_texts:
            embeddings = embedding_service.embed(chunk_texts)  # type: ignore[assignment]
    except Exception as exc:
        embed_error = str(exc)
        logger.error(
            "Embedding failed for '%s' — chunks stored without embeddings: %s",
            filename, exc, exc_info=True
        )

    document = Document(
        user_id=user_id,
        filename=filename,
        stored_filename=stored_filename,
        title=title,
        file_size=len(contents),
        text_content=text,
    )
    document.chunks = [
        DocumentChunk(chunk_index=i, content=chunk, embedding=embeddings[i])
        for i, chunk in enumerate(chunks)
    ]
    db.add(document)
    try:
        db.commit()
    except Exception:
        db.rollback()
        os.remove(path)
        raise
    db.refresh(document)
    if embed_error:
        # Document is committed; raise EmbedWarning so the route can return
        # a 201 with the document but surface the warning in a header/log.
        raise EmbedWarning(
            f"PDF uploaded ({len(chunks)} chunks) but embedding failed — "
            f"RAG questions will return no results. Error: {embed_error}",
            document,
        )
    return document


def list_documents(db: Session, user_id: int) -> list[Document]:
    stmt = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    return list(db.scalars(stmt))


def get_document(db: Session, user_id: int, document_id: int) -> Document | None:
    document = db.get(Document, document_id)
    if document is None or document.user_id != user_id:
        return None
    return document


def list_chunks(db: Session, document_id: int) -> list[DocumentChunk]:
    stmt = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    return list(db.scalars(stmt))


def delete_document(db: Session, document: Document) -> None:
    path = os.path.join(settings.upload_dir, document.stored_filename)
    if os.path.exists(path):
        os.remove(path)
    db.delete(document)
    db.commit()
