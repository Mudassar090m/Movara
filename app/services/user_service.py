import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserCreate


def hash_password(password: str) -> str:
    # bcrypt truncates at 72 bytes; the schema enforces this, but guard here too.
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password exceeds 72-byte bcrypt limit")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if len(password.encode("utf-8")) > 72:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_user(db: Session, data: UserCreate, email: str | None = None) -> User:
    user = User(
        email=(email or data.email).lower(),  # always store lower-case
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email)).first()
