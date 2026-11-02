from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conversation
from app.schemas import ConversationCreate, ConversationUpdate


def create_conversation(db: Session, user_id: int, data: ConversationCreate) -> Conversation:
    conversation = Conversation(
        user_id=user_id,
        title=data.title or "New Conversation",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def list_conversations(db: Session, user_id: int) -> list[Conversation]:
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(db.scalars(stmt))


def get_conversation(db: Session, conversation_id: int) -> Conversation | None:
    return db.get(Conversation, conversation_id)


def update_conversation(
    db: Session, conversation: Conversation, data: ConversationUpdate
) -> Conversation:
    conversation.title = data.title
    db.commit()
    db.refresh(conversation)
    return conversation


def delete_conversation(db: Session, conversation: Conversation) -> None:
    db.delete(conversation)
    db.commit()
