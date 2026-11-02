from sqlalchemy.orm import Session

from app.models import Conversation, Message
from app.schemas import MessageCreate
from app.services import message_service, ollama_service

# Keep the last N message pairs (user + assistant) sent to the model.
# Ollama's context window is small; sending the whole history causes silent truncation.
MAX_HISTORY_PAIRS = 10
SYSTEM_PROMPT = (
    "You are StudyMate AI, a helpful and concise study assistant. "
    "Answer clearly and accurately. If you are unsure, say so."
)


def _trim_history(messages: list[Message]) -> list[dict]:
    """Return the last MAX_HISTORY_PAIRS pairs plus a leading system prompt."""
    # Convert to dicts; keep only user/assistant roles for the model.
    history = [
        {"role": m.role, "content": m.content}
        for m in messages
        if m.role in ("user", "assistant")
    ]
    # Take the last (MAX_HISTORY_PAIRS * 2) messages (each pair = 1 user + 1 assistant).
    trimmed = history[-(MAX_HISTORY_PAIRS * 2):]
    return [{"role": "system", "content": SYSTEM_PROMPT}] + trimmed


def send_message(
    db: Session, conversation: Conversation, content: str
) -> tuple[Message, Message]:
    """Save the user message, ask the local model, save the reply, return both.

    The user message is committed first so it is preserved even if the model fails.
    """
    # 1. Persist the user's message.
    user_message = message_service.create_message(
        db, conversation.id, "user", MessageCreate(content=content)
    )
    # 2. Build a trimmed chat history for the model.
    history = message_service.list_messages(db, conversation.id)
    messages = _trim_history(history)
    # 3. Ask the local model.
    reply = ollama_service.chat(messages)
    # 4. Persist the assistant's reply and bump the conversation's updated_at.
    assistant_message = message_service.create_message(
        db, conversation.id, "assistant", MessageCreate(content=reply)
    )
    from sqlalchemy import func
    conversation.updated_at = func.now()  # type: ignore[assignment]
    db.commit()
    return user_message, assistant_message
