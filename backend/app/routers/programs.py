from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.program import ProgramCreate, ProgramRead, ProgramUpdate
from app.services import program_service
from app.services.auth_service import CurrentUser


router = APIRouter(prefix="/programs", tags=["programs"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ProgramRead])
def list_programs(db: DbSession, current_user: CurrentUser) -> list[ProgramRead]:
    return program_service.list_programs(db, current_user.id)  # type: ignore[return-value]


@router.post("", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
def create_program(
    payload: ProgramCreate, db: DbSession, current_user: CurrentUser
) -> ProgramRead:
    return program_service.create_program(db, current_user.id, payload)  # type: ignore[return-value]


@router.get("/{program_id}", response_model=ProgramRead)
def get_program(
    program_id: int, db: DbSession, current_user: CurrentUser
) -> ProgramRead:
    return program_service.get_program(db, current_user.id, program_id)  # type: ignore[return-value]


@router.put("/{program_id}", response_model=ProgramRead)
def update_program(
    program_id: int,
    payload: ProgramUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ProgramRead:
    return program_service.update_program(  # type: ignore[return-value]
        db, current_user.id, program_id, payload
    )


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: int, db: DbSession, current_user: CurrentUser
) -> Response:
    program_service.delete_program(db, current_user.id, program_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

