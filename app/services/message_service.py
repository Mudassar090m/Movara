from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Message
from app.schemas import MessageCreate


def create_message(
    db: Session, conversation_id: int, role: str, data: MessageCreate
) -> Message:
    message = Message(conversation_id=conversation_id, role=role, content=data.content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_messages(db: Session, conversation_id: int) -> list[Message]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
    )
    return list(db.scalars(stmt))
