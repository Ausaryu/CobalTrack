from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, LogoutResponse, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth_service import CurrentUser, authenticate_user, register_user


router = APIRouter(prefix="/auth", tags=["auth"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    user = register_user(db, payload)
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = authenticate_user(db, str(payload.email), payload.password)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/logout", response_model=LogoutResponse)
def logout(_current_user: CurrentUser) -> LogoutResponse:
    # JWTs are stateless; the client discards its token for the MVP logout flow.
    return LogoutResponse()

