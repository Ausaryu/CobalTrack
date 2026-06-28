from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import NamedTuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.workout import WorkoutExercise, WorkoutSession, WorkoutSet
from app.schemas.stats import (
    DashboardSummary,
    ExerciseProgress,
    ExerciseProgressPoint,
    ExerciseRecord,
    LastWorkoutSummary,
    TopExerciseByVolume,
)


class SetStatRow(NamedTuple):
    workout_id: int
    performed_at: date
    exercise_id: int
    exercise_name: str
    weight: float | None
    reps: int | None


@dataclass
class RecordAggregate:
    exercise_name: str
    performed_at: date
    max_weight: float = 0.0
    max_reps: int = 0
    best_e1rm: float = 0.0


@dataclass
class ProgressAggregate:
    performed_at: date
    max_weight: float = 0.0
    total_volume: float = 0.0
    best_e1rm: float = 0.0


def calculate_volume(weight: float | None, reps: int | None) -> float:
    if weight is None or reps is None:
        return 0.0
    return round(weight * reps, 2)


def calculate_e1rm(weight: float | None, reps: int | None) -> float:
    if weight is None or reps is None or weight <= 0 or reps <= 0:
        return 0.0
    return round(weight * (1 + reps / 30), 2)


def _set_rows(
    db: Session, user_id: int, exercise_id: int | None = None
) -> list[SetStatRow]:
    statement = (
        select(
            WorkoutSession.id,
            WorkoutSession.performed_at,
            WorkoutExercise.exercise_id,
            Exercise.name,
            WorkoutSet.weight,
            WorkoutSet.reps,
        )
        .join(WorkoutExercise, WorkoutExercise.workout_session_id == WorkoutSession.id)
        .join(Exercise, Exercise.id == WorkoutExercise.exercise_id)
        .outerjoin(WorkoutSet, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.performed_at, WorkoutSession.id)
    )
    if exercise_id is not None:
        statement = statement.where(WorkoutExercise.exercise_id == exercise_id)

    return [SetStatRow(*row) for row in db.execute(statement).all()]


def get_dashboard(db: Session, user_id: int, today: date | None = None) -> DashboardSummary:
    current_day = today or date.today()
    week_start = current_day - timedelta(days=current_day.weekday())
    week_end = week_start + timedelta(days=6)

    last_workout_model = db.scalar(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.performed_at.desc(), WorkoutSession.id.desc())
        .limit(1)
    )
    last_workout = (
        LastWorkoutSummary(
            id=last_workout_model.id,
            name=last_workout_model.name,
            performed_at=last_workout_model.performed_at,
            duration_minutes=last_workout_model.duration_minutes,
        )
        if last_workout_model is not None
        else None
    )

    weekly_workout_ids = set(
        db.scalars(
            select(WorkoutSession.id).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.performed_at >= week_start,
                WorkoutSession.performed_at <= week_end,
            )
        ).all()
    )

    rows = _set_rows(db, user_id)
    weekly_volume = round(
        sum(
            calculate_volume(row.weight, row.reps)
            for row in rows
            if row.workout_id in weekly_workout_ids
        ),
        2,
    )

    exercise_totals: dict[int, float] = defaultdict(float)
    exercise_names: dict[int, str] = {}
    record_values: dict[int, RecordAggregate] = {}
    for row in rows:
        exercise_names[row.exercise_id] = row.exercise_name
        exercise_totals[row.exercise_id] += calculate_volume(row.weight, row.reps)
        if row.weight is None and row.reps is None:
            continue
        record = record_values.setdefault(
            row.exercise_id,
            RecordAggregate(
                exercise_name=row.exercise_name,
                performed_at=row.performed_at,
            ),
        )
        record.performed_at = max(record.performed_at, row.performed_at)
        record.max_weight = max(record.max_weight, row.weight or 0.0)
        record.max_reps = max(record.max_reps, row.reps or 0)
        record.best_e1rm = max(record.best_e1rm, calculate_e1rm(row.weight, row.reps))

    recent_records = [
        ExerciseRecord(
            exercise_id=exercise_id,
            exercise_name=values.exercise_name,
            performed_at=values.performed_at,
            max_weight=values.max_weight,
            max_reps=values.max_reps,
            best_e1rm=values.best_e1rm,
        )
        for exercise_id, values in sorted(
            record_values.items(),
            key=lambda item: (item[1].performed_at, item[0]),
            reverse=True,
        )[:5]
    ]
    top_exercises = [
        TopExerciseByVolume(
            exercise_id=exercise_id,
            exercise_name=exercise_names[exercise_id],
            total_volume=round(total_volume, 2),
        )
        for exercise_id, total_volume in sorted(
            exercise_totals.items(), key=lambda item: (item[1], item[0]), reverse=True
        )
        if total_volume > 0
    ][:5]

    return DashboardSummary(
        last_workout=last_workout,
        workouts_this_week=len(weekly_workout_ids),
        weekly_volume=weekly_volume,
        recent_records=recent_records,
        top_exercises_by_volume=top_exercises,
    )


def get_exercise_progress(
    db: Session, user_id: int, exercise_id: int
) -> ExerciseProgress:
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    rows = _set_rows(db, user_id, exercise_id)
    if not rows:
        return ExerciseProgress(
            exercise_id=exercise.id,
            exercise_name=exercise.name,
            total_sessions=0,
            max_weight=0,
            max_reps=0,
            max_volume=0,
            best_e1rm=0,
            history=[],
        )

    by_workout: dict[int, ProgressAggregate] = {}
    max_weight = 0.0
    max_reps = 0
    best_e1rm = 0.0
    for row in rows:
        point = by_workout.setdefault(
            row.workout_id,
            ProgressAggregate(performed_at=row.performed_at),
        )
        volume = calculate_volume(row.weight, row.reps)
        e1rm = calculate_e1rm(row.weight, row.reps)
        point.max_weight = max(point.max_weight, row.weight or 0.0)
        point.total_volume += volume
        point.best_e1rm = max(point.best_e1rm, e1rm)
        max_weight = max(max_weight, row.weight or 0.0)
        max_reps = max(max_reps, row.reps or 0)
        best_e1rm = max(best_e1rm, e1rm)

    history = [
        ExerciseProgressPoint(
            performed_at=values.performed_at,
            max_weight=round(values.max_weight, 2),
            total_volume=round(values.total_volume, 2),
            best_e1rm=round(values.best_e1rm, 2),
        )
        for _, values in sorted(
            by_workout.items(),
            key=lambda item: (item[1].performed_at, item[0]),
        )
    ]

    return ExerciseProgress(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        total_sessions=len(by_workout),
        max_weight=round(max_weight, 2),
        max_reps=max_reps,
        max_volume=max((point.total_volume for point in history), default=0),
        best_e1rm=round(best_e1rm, 2),
        history=history,
    )
