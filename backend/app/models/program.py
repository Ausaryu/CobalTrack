from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User


class Program(TimestampMixin, Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    goal: Mapped[str | None] = mapped_column(String(255))
    days_per_week: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="programs")
    days: Mapped[list["ProgramDay"]] = relationship(
        back_populates="program",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProgramDay.order_index",
    )


class ProgramDay(Base):
    __tablename__ = "program_days"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    program: Mapped[Program] = relationship(back_populates="days")
    exercises: Mapped[list["ProgramExercise"]] = relationship(
        back_populates="program_day",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProgramExercise.order_index",
    )


class ProgramExercise(Base):
    __tablename__ = "program_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_day_id: Mapped[int] = mapped_column(
        ForeignKey("program_days.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="RESTRICT"), index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    sets_count: Mapped[int] = mapped_column(Integer)
    min_reps: Mapped[int | None] = mapped_column(Integer)
    max_reps: Mapped[int | None] = mapped_column(Integer)
    target_weight: Mapped[float | None] = mapped_column(Float)
    target_assistance_weight: Mapped[float | None] = mapped_column(Float)
    target_added_weight: Mapped[float | None] = mapped_column(Float)
    target_bodyweight: Mapped[float | None] = mapped_column(Float)
    target_duration_seconds: Mapped[int | None] = mapped_column(Integer)
    target_distance_meters: Mapped[float | None] = mapped_column(Float)
    target_calories: Mapped[int | None] = mapped_column(Integer)
    target_resistance_level: Mapped[float | None] = mapped_column(Float)
    target_rpe: Mapped[float | None] = mapped_column(Float)
    rest_seconds: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)

    program_day: Mapped[ProgramDay] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="program_entries")
