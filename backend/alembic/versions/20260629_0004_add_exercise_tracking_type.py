"""Add exercise tracking type and backfill existing exercises.

Revision ID: 20260629_0004
Revises: 20260629_0003
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260629_0004"
down_revision: str | None = "20260629_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "exercises",
        sa.Column(
            "tracking_type",
            sa.String(length=32),
            server_default="WEIGHT_REPS",
            nullable=False,
        ),
    )
    op.execute(
        sa.text(
            """
            UPDATE exercises
            SET tracking_type = CASE
                WHEN replace(replace(replace(lower(trim(equipment)), '  ', ' '), '  ', ' '), '  ', ' ')
                    = 'assisted'
                    THEN 'ASSISTED_BODYWEIGHT_REPS'
                WHEN replace(replace(replace(lower(trim(equipment)), '  ', ' '), '  ', ' '), '  ', ' ')
                    IN ('body weight', 'stability ball', 'bosu ball', 'roller', 'wheel roller')
                    THEN 'BODYWEIGHT_REPS'
                WHEN replace(replace(replace(lower(trim(equipment)), '  ', ' '), '  ', ' '), '  ', ' ')
                    = 'weighted'
                    THEN 'ADDED_BODYWEIGHT_REPS'
                WHEN replace(replace(replace(lower(trim(equipment)), '  ', ' '), '  ', ' '), '  ', ' ')
                    IN (
                        'elliptical machine',
                        'stationary bike',
                        'stepmill machine',
                        'skierg machine',
                        'upper body ergometer'
                    )
                    THEN 'CARDIO'
                ELSE 'WEIGHT_REPS'
            END
            """
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("exercises") as batch_op:
        batch_op.drop_column("tracking_type")
