from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Document, DocumentChunk, User
from app.schemas import DocumentChunkOut, DocumentOut, RAGRequest, RAGResponse
from app.services import document_service, rag_service
from app.services.document_service import EmbedWarning
from app.services.ollama_service import OllamaError

router = APIRouter(prefix="/documents", tags=["documents"])


def _chunk_counts(db: Session, document_ids: list[int]) -> dict[int, int]:
    """Return {document_id: chunk_count} using a single GROUP BY query."""
    if not document_ids:
        return {}
    rows = db.execute(
        select(DocumentChunk.document_id, func.count().label("n"))
        .where(DocumentChunk.document_id.in_(document_ids))
        .group_by(DocumentChunk.document_id)
    ).all()
    return {row.document_id: row.n for row in rows}


def _to_out(doc: Document, num_chunks: int) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        user_id=doc.user_id,
        filename=doc.filename,
        title=doc.title,
        file_size=doc.file_size,
        num_chunks=num_chunks,
        created_at=doc.created_at,
    )


def _get_owned_document(db: Session, document_id: int, current_user: User) -> Document:
    doc = document_service.get_document(db, current_user.id, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or ""
    # Read in chunks to avoid loading the whole file before the size check.
    max_bytes = document_service.get_max_upload_bytes()
    contents = b""
    for chunk in file.file:
        contents += chunk
        if len(contents) > max_bytes:
            raise HTTPException(status_code=400, detail=f"File is too large (max {max_bytes} bytes)")
    try:
        document = document_service.save_upload(
            db, current_user.id, filename, contents, title
        )
    except EmbedWarning as exc:
        # Document was saved but embedding failed — return 201 with the document
        # and include the warning in the response headers so the UI can show it.
        import logging as _logging
        _logging.getLogger("studymate").warning("Embed warning for '%s': %s", filename, exc)
        from fastapi.responses import JSONResponse
        counts = _chunk_counts(db, [exc.document.id])
        out = _to_out(exc.document, counts.get(exc.document.id, 0))
        return JSONResponse(
            status_code=201,
            content=out.model_dump(mode="json"),
            headers={"X-Embed-Warning": str(exc)[:500]},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        import logging
        logging.getLogger("studymate").error("upload_document failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not process the PDF")
    counts = _chunk_counts(db, [document.id])
    return _to_out(document, counts.get(document.id, 0))


@router.get("", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = document_service.list_documents(db, current_user.id)
    counts = _chunk_counts(db, [d.id for d in docs])
    return [_to_out(d, counts.get(d.id, 0)) for d in docs]


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    counts = _chunk_counts(db, [doc.id])
    return _to_out(doc, counts.get(doc.id, 0))


@router.get("/{document_id}/chunks", response_model=list[DocumentChunkOut])
def list_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    return document_service.list_chunks(db, doc.id)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    document_service.delete_document(db, doc)


@router.post("/{document_id}/ask", response_model=RAGResponse)
def ask_document(
    document_id: int,
    payload: RAGRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    try:
        answer = rag_service.answer(db, current_user.id, doc.id, payload.question)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return RAGResponse(document_id=doc.id, question=payload.question, answer=answer)
