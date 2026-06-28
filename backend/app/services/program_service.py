from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.program import Program, ProgramDay, ProgramExercise
from app.schemas.program import ProgramCreate, ProgramDayInput, ProgramUpdate


def _validate_exercises(db: Session, exercise_ids: set[int]) -> None:
    if not exercise_ids:
        return
    existing_ids = set(
        db.scalars(select(Exercise.id).where(Exercise.id.in_(exercise_ids))).all()
    )
    missing = sorted(exercise_ids - existing_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Unknown exercise ids", "exercise_ids": missing},
        )


def _build_days(items: list[ProgramDayInput]) -> list[ProgramDay]:
    return [
        ProgramDay(
            name=item.name,
            order_index=item.order_index,
            exercises=[
                ProgramExercise(**exercise.model_dump()) for exercise in item.exercises
            ],
        )
        for item in items
    ]


def _exercise_ids(items: list[ProgramDayInput]) -> set[int]:
    return {exercise.exercise_id for day in items for exercise in day.exercises}


def search_programs(
    db: Session,
    user_id: int,
    q: str | None = None,
    is_active: bool | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Program], int]:
    stmt = select(Program).where(Program.user_id == user_id)
    if q:
        stmt = stmt.where(
            or_(Program.name.ilike(f"%{q}%"), Program.goal.ilike(f"%{q}%"))
        )
    if is_active is not None:
        stmt = stmt.where(Program.is_active == is_active)
    stmt = stmt.order_by(Program.is_active.desc(), Program.id.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.offset(offset).limit(limit)).all())
    return items, total


def list_programs(db: Session, user_id: int) -> list[Program]:
    statement = (
        select(Program)
        .where(Program.user_id == user_id)
        .order_by(Program.is_active.desc(), Program.id.desc())
    )
    return list(db.scalars(statement).all())


def get_program(db: Session, user_id: int, program_id: int) -> Program:
    program = db.scalar(
        select(Program).where(Program.id == program_id, Program.user_id == user_id)
    )
    if program is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")
    return program


def create_program(db: Session, user_id: int, payload: ProgramCreate) -> Program:
    _validate_exercises(db, _exercise_ids(payload.days))
    program = Program(
        user_id=user_id,
        **payload.model_dump(exclude={"days"}),
        days=_build_days(payload.days),
    )
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


def update_program(
    db: Session, user_id: int, program_id: int, payload: ProgramUpdate
) -> Program:
    program = get_program(db, user_id, program_id)
    values = payload.model_dump(exclude_unset=True, exclude={"days"})
    for field, value in values.items():
        if field in {"name", "days_per_week", "is_active"} and value is None:
            continue
        setattr(program, field, value)

    if "days" in payload.model_fields_set:
        days = payload.days or []
        _validate_exercises(db, _exercise_ids(days))
        program.days.clear()
        db.flush()
        program.days.extend(_build_days(days))

    db.commit()
    db.refresh(program)
    return program


def delete_program(db: Session, user_id: int, program_id: int) -> None:
    program = get_program(db, user_id, program_id)
    db.delete(program)
    db.commit()
