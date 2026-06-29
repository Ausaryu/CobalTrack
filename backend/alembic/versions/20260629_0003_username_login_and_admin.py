"""Use username authentication and add the administrator role.

Revision ID: 20260629_0003
Revises: 20260628_0002
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260629_0003"
down_revision: str | None = "20260628_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.execute(sa.text("UPDATE users SET is_admin = 1"))
    op.execute(sa.text("UPDATE users SET username = lower(trim(username))"))
    op.execute(
        sa.text(
            """
            UPDATE users
            SET username = username || '-' || id
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT
                        id,
                        row_number() OVER (PARTITION BY username ORDER BY id) AS duplicate_rank
                    FROM users
                ) AS ranked_users
                WHERE duplicate_rank > 1
            )
            """
        )
    )
    op.drop_index(op.f("ix_users_email"), table_name="users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("email")
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_username"), table_name="users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("email", sa.String(length=320), nullable=True))
    op.execute(
        sa.text(
            "UPDATE users SET email = username || '-' || id || '@legacy.local'"
        )
    )
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("email", existing_type=sa.String(length=320), nullable=False)
        batch_op.drop_column("is_admin")
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
