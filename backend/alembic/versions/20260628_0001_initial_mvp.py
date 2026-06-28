"""Create the CobalTrack MVP schema.

Revision ID: 20260628_0001
Revises: None
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260628_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("body_part", sa.String(length=100), nullable=True),
        sa.Column("target", sa.String(length=100), nullable=True),
        sa.Column("muscle_group", sa.String(length=100), nullable=True),
        sa.Column("equipment", sa.String(length=100), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(length=500), nullable=True),
        sa.Column("gif_path", sa.String(length=500), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_exercises")),
    )
    op.create_index(op.f("ix_exercises_external_id"), "exercises", ["external_id"], unique=True)
    op.create_index(op.f("ix_exercises_name"), "exercises", ["name"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "exercise_secondary_muscles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("muscle_name", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(
            ["exercise_id"], ["exercises.id"], name=op.f("fk_exercise_secondary_muscles_exercise_id_exercises"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_exercise_secondary_muscles")),
        sa.UniqueConstraint("exercise_id", "muscle_name", name="uq_exercise_secondary_muscle"),
    )
    op.create_index(
        op.f("ix_exercise_secondary_muscles_exercise_id"),
        "exercise_secondary_muscles",
        ["exercise_id"],
        unique=False,
    )

    op.create_table(
        "programs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("goal", sa.String(length=255), nullable=True),
        sa.Column("days_per_week", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_programs_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_programs")),
    )
    op.create_index(op.f("ix_programs_user_id"), "programs", ["user_id"], unique=False)

    op.create_table(
        "user_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("custom_name", sa.String(length=255), nullable=True),
        sa.Column("custom_notes", sa.Text(), nullable=True),
        sa.Column("is_hidden", sa.Boolean(), nullable=False),
        sa.Column("is_favorite", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], name=op.f("fk_user_exercises_exercise_id_exercises"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_exercises_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_exercises")),
        sa.UniqueConstraint("user_id", "exercise_id", name="uq_user_exercise"),
    )
    op.create_index(op.f("ix_user_exercises_exercise_id"), "user_exercises", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_user_exercises_user_id"), "user_exercises", ["user_id"], unique=False)

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("performed_at", sa.Date(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("perceived_difficulty", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_workout_sessions_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workout_sessions")),
    )
    op.create_index(op.f("ix_workout_sessions_performed_at"), "workout_sessions", ["performed_at"], unique=False)
    op.create_index(op.f("ix_workout_sessions_user_id"), "workout_sessions", ["user_id"], unique=False)

    op.create_table(
        "program_days",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("program_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["program_id"], ["programs.id"], name=op.f("fk_program_days_program_id_programs"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_program_days")),
    )
    op.create_index(op.f("ix_program_days_program_id"), "program_days", ["program_id"], unique=False)

    op.create_table(
        "workout_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_session_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], name=op.f("fk_workout_exercises_exercise_id_exercises"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["workout_session_id"], ["workout_sessions.id"], name=op.f("fk_workout_exercises_workout_session_id_workout_sessions"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workout_exercises")),
    )
    op.create_index(op.f("ix_workout_exercises_exercise_id"), "workout_exercises", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_workout_exercises_workout_session_id"), "workout_exercises", ["workout_session_id"], unique=False)

    op.create_table(
        "program_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("program_day_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("sets_count", sa.Integer(), nullable=False),
        sa.Column("min_reps", sa.Integer(), nullable=True),
        sa.Column("max_reps", sa.Integer(), nullable=True),
        sa.Column("target_weight", sa.Float(), nullable=True),
        sa.Column("target_rpe", sa.Float(), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], name=op.f("fk_program_exercises_exercise_id_exercises"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["program_day_id"], ["program_days.id"], name=op.f("fk_program_exercises_program_day_id_program_days"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_program_exercises")),
    )
    op.create_index(op.f("ix_program_exercises_exercise_id"), "program_exercises", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_program_exercises_program_day_id"), "program_exercises", ["program_day_id"], unique=False)

    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_exercise_id", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("reps", sa.Integer(), nullable=True),
        sa.Column("rpe", sa.Float(), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), nullable=True),
        sa.Column("is_warmup", sa.Boolean(), nullable=False),
        sa.Column("is_failure", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["workout_exercise_id"], ["workout_exercises.id"], name=op.f("fk_workout_sets_workout_exercise_id_workout_exercises"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workout_sets")),
    )
    op.create_index(op.f("ix_workout_sets_workout_exercise_id"), "workout_sets", ["workout_exercise_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_workout_sets_workout_exercise_id"), table_name="workout_sets")
    op.drop_table("workout_sets")
    op.drop_index(op.f("ix_program_exercises_program_day_id"), table_name="program_exercises")
    op.drop_index(op.f("ix_program_exercises_exercise_id"), table_name="program_exercises")
    op.drop_table("program_exercises")
    op.drop_index(op.f("ix_workout_exercises_workout_session_id"), table_name="workout_exercises")
    op.drop_index(op.f("ix_workout_exercises_exercise_id"), table_name="workout_exercises")
    op.drop_table("workout_exercises")
    op.drop_index(op.f("ix_program_days_program_id"), table_name="program_days")
    op.drop_table("program_days")
    op.drop_index(op.f("ix_workout_sessions_user_id"), table_name="workout_sessions")
    op.drop_index(op.f("ix_workout_sessions_performed_at"), table_name="workout_sessions")
    op.drop_table("workout_sessions")
    op.drop_index(op.f("ix_user_exercises_user_id"), table_name="user_exercises")
    op.drop_index(op.f("ix_user_exercises_exercise_id"), table_name="user_exercises")
    op.drop_table("user_exercises")
    op.drop_index(op.f("ix_programs_user_id"), table_name="programs")
    op.drop_table("programs")
    op.drop_index(op.f("ix_exercise_secondary_muscles_exercise_id"), table_name="exercise_secondary_muscles")
    op.drop_table("exercise_secondary_muscles")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_exercises_name"), table_name="exercises")
    op.drop_index(op.f("ix_exercises_external_id"), table_name="exercises")
    op.drop_table("exercises")
