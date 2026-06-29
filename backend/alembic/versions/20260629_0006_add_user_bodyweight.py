"""Add current bodyweight to user profiles.

Revision ID: 20260629_0006
Revises: 20260629_0005
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260629_0006"
down_revision: str | None = "20260629_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("current_bodyweight_kg", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("current_bodyweight_kg")
