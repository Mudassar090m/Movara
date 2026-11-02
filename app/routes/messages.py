from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import ChatResponse, MessageCreate, MessageOut
from app.services import chat_service, conversation_service, message_service
from app.services.ollama_service import OllamaError

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])


def _get_owned_conversation(db: Session, conversation_id: int, current_user: User):
    # Mirrors the ownership check in routes/conversations.py (404 hides existence).
    conversation = conversation_service.get_conversation(db, conversation_id)
    if conversation is None or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_owned_conversation(db, conversation_id, current_user)
    try:
        user_message, assistant_message = chat_service.send_message(
            db, conversation, payload.content
        )
    except OllamaError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    return ChatResponse(user_message=user_message, assistant_message=assistant_message)


@router.get("", response_model=list[MessageOut])
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_conversation(db, conversation_id, current_user)
    return message_service.list_messages(db, conversation_id)
