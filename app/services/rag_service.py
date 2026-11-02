from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk
from app.services import embedding_service, ollama_service


def answer(db: Session, user_id: int, document_id: int, question: str) -> str:
    """Retrieve the most relevant chunks from the document and answer the question.

    Only searches chunks that belong to the authenticated user's document (user_id
    is checked here as a defence-in-depth measure; the route also checks ownership).
    """
    # 1. embed the question
    q_embedding = embedding_service.embed([question])[0]

    # 2. find the top-3 most similar chunks (cosine distance, lower = more similar)
    stmt = (
        select(DocumentChunk)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.id == document_id, Document.user_id == user_id)
        .where(DocumentChunk.embedding.is_not(None))
        .order_by(DocumentChunk.embedding.cosine_distance(q_embedding))
        .limit(3)
    )
    chunks = list(db.scalars(stmt))

    if not chunks:
        return (
            "I couldn't find any relevant content in this document to answer your question."
        )

    context = "\n\n".join(
        f"[Chunk {c.chunk_index}]\n{c.content}" for c in chunks
    )

    prompt = (
        "You are a helpful study assistant. Answer the question below using ONLY "
        "the provided document context. If the context does not contain enough "
        "information, say so clearly.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )

    return ollama_service.chat([{"role": "user", "content": prompt}])
