from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, String, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.exercise import UserExercise
    from app.models.program import Program
    from app.models.workout import WorkoutSession


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=false(),
        nullable=False,
    )
    current_bodyweight_kg: Mapped[float | None] = mapped_column(Float)

    exercise_preferences: Mapped[list["UserExercise"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    workouts: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    programs: Mapped[list["Program"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
