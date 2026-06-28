"""Add multilingual exercise translations.

Revision ID: 20260628_0002
Revises: 20260628_0001
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260628_0002"
down_revision: str | None = "20260628_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("translations", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("exercises", "translations")
