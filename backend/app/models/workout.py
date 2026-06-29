from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User


class WorkoutSession(TimestampMixin, Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    performed_at: Mapped[date] = mapped_column(Date, index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    perceived_difficulty: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="workouts")
    exercises: Mapped[list["WorkoutExercise"]] = relationship(
        back_populates="workout_session",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="WorkoutExercise.order_index",
    )


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="RESTRICT"), index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)

    workout_session: Mapped[WorkoutSession] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="workout_entries")
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="workout_exercise",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="WorkoutSet.order_index",
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("workout_exercises.id", ondelete="CASCADE"), index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    weight: Mapped[float | None] = mapped_column(Float)
    assistance_weight: Mapped[float | None] = mapped_column(Float)
    added_weight: Mapped[float | None] = mapped_column(Float)
    bodyweight: Mapped[float | None] = mapped_column(Float)
    reps: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    distance_meters: Mapped[float | None] = mapped_column(Float)
    calories: Mapped[int | None] = mapped_column(Integer)
    resistance_level: Mapped[float | None] = mapped_column(Float)
    rpe: Mapped[float | None] = mapped_column(Float)
    rest_seconds: Mapped[int | None] = mapped_column(Integer)
    is_warmup: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_failure: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    workout_exercise: Mapped[WorkoutExercise] = relationship(back_populates="sets")
