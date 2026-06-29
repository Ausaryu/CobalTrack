"""Add tracking-specific fields to workout sets and program exercises.

Revision ID: 20260629_0005
Revises: 20260629_0004
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260629_0005"
down_revision: str | None = "20260629_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


WORKOUT_SET_COLUMNS = (
    sa.Column("assistance_weight", sa.Float(), nullable=True),
    sa.Column("added_weight", sa.Float(), nullable=True),
    sa.Column("bodyweight", sa.Float(), nullable=True),
    sa.Column("duration_seconds", sa.Integer(), nullable=True),
    sa.Column("distance_meters", sa.Float(), nullable=True),
    sa.Column("calories", sa.Integer(), nullable=True),
    sa.Column("resistance_level", sa.Float(), nullable=True),
)

PROGRAM_EXERCISE_COLUMNS = (
    sa.Column("target_assistance_weight", sa.Float(), nullable=True),
    sa.Column("target_added_weight", sa.Float(), nullable=True),
    sa.Column("target_bodyweight", sa.Float(), nullable=True),
    sa.Column("target_duration_seconds", sa.Integer(), nullable=True),
    sa.Column("target_distance_meters", sa.Float(), nullable=True),
    sa.Column("target_calories", sa.Integer(), nullable=True),
    sa.Column("target_resistance_level", sa.Float(), nullable=True),
)


def upgrade() -> None:
    for column in WORKOUT_SET_COLUMNS:
        op.add_column("workout_sets", column)
    for column in PROGRAM_EXERCISE_COLUMNS:
        op.add_column("program_exercises", column)


def downgrade() -> None:
    with op.batch_alter_table("program_exercises") as batch_op:
        for column in reversed(PROGRAM_EXERCISE_COLUMNS):
            batch_op.drop_column(column.name)
    with op.batch_alter_table("workout_sets") as batch_op:
        for column in reversed(WORKOUT_SET_COLUMNS):
            batch_op.drop_column(column.name)
