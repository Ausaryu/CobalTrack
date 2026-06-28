from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.program import ProgramExercise
    from app.models.user import User
    from app.models.workout import WorkoutExercise


class Exercise(TimestampMixin, Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str | None] = mapped_column(String(100))
    body_part: Mapped[str | None] = mapped_column(String(100))
    target: Mapped[str | None] = mapped_column(String(100))
    muscle_group: Mapped[str | None] = mapped_column(String(100))
    equipment: Mapped[str | None] = mapped_column(String(100))
    instructions: Mapped[str | None] = mapped_column(Text)
    translations: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(500))
    gif_path: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str | None] = mapped_column(String(255))

    secondary_muscles: Mapped[list["ExerciseSecondaryMuscle"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan", lazy="selectin"
    )
    user_preferences: Mapped[list["UserExercise"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan"
    )
    workout_entries: Mapped[list["WorkoutExercise"]] = relationship(
        back_populates="exercise"
    )
    program_entries: Mapped[list["ProgramExercise"]] = relationship(
        back_populates="exercise"
    )


class ExerciseSecondaryMuscle(Base):
    __tablename__ = "exercise_secondary_muscles"
    __table_args__ = (
        UniqueConstraint("exercise_id", "muscle_name", name="uq_exercise_secondary_muscle"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True
    )
    muscle_name: Mapped[str] = mapped_column(String(100))

    exercise: Mapped[Exercise] = relationship(back_populates="secondary_muscles")


class UserExercise(TimestampMixin, Base):
    __tablename__ = "user_exercises"
    __table_args__ = (
        UniqueConstraint("user_id", "exercise_id", name="uq_user_exercise"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True
    )
    custom_name: Mapped[str | None] = mapped_column(String(255))
    custom_notes: Mapped[str | None] = mapped_column(Text)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="exercise_preferences")
    exercise: Mapped[Exercise] = relationship(back_populates="user_preferences")
