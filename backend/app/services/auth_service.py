from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserUpdate


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def register_user(db: Session, payload: RegisterRequest) -> User:
    normalized_username = payload.username.strip().lower()
    if db.scalar(select(User).where(User.username == normalized_username)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this username already exists",
        )

    is_first_user = db.scalar(select(User.id).limit(1)) is None
    user = User(
        username=normalized_username,
        hashed_password=hash_password(payload.password),
        is_admin=is_first_user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username.strip().lower()))
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user


def update_user_profile(db: Session, user: User, payload: UserUpdate) -> User:
    user.current_bodyweight_kg = payload.current_bodyweight_kg
    db.commit()
    db.refresh(user)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(current_user: CurrentUser) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return current_user


AdminUser = Annotated[User, Depends(require_admin)]
