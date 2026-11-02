"""kb articles learned from tickets

Revision ID: b7d41e2a9c10
Revises: cf3e1f3a003f
Create Date: 2026-11-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d41e2a9c10'
down_revision: Union[str, Sequence[str], None] = 'cf3e1f3a003f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIES = ('Network', 'Software', 'Hardware', 'Account/Access', 'Email', 'Other')
ARTICLE_STATUSES = ('AWAITING_CLOSURE', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED')


def upgrade() -> None:
    """Upgrade schema."""
    # Existing documents all come from /kb files.
    op.add_column(
        'kb_documents',
        sa.Column(
            'origin',
            sa.Enum('file', 'ticket', name='kb_origin', native_enum=False, length=32),
            server_default='file',
            nullable=False,
        ),
    )
    op.create_table(
        'kb_articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum(*ARTICLE_STATUSES, name='kb_article_status', native_enum=False, length=32), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('category', sa.Enum(*CATEGORIES, name='category', native_enum=False, length=32), nullable=False),
        sa.Column('problem', sa.Text(), nullable=False),
        sa.Column('cause', sa.Text(), nullable=True),
        sa.Column('steps', sa.Text(), nullable=False),
        sa.Column('confirmed_by_employee', sa.Boolean(), nullable=False),
        sa.Column('submitted_by_id', sa.Integer(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_note', sa.String(length=500), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['document_id'], ['kb_documents.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_kb_articles_ticket_id'), 'kb_articles', ['ticket_id'], unique=False)
    op.create_index(op.f('ix_kb_articles_status'), 'kb_articles', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Learned documents only exist through their articles; remove them with the table.
    op.execute("DELETE FROM kb_documents WHERE origin = 'ticket'")
    op.drop_index(op.f('ix_kb_articles_status'), table_name='kb_articles')
    op.drop_index(op.f('ix_kb_articles_ticket_id'), table_name='kb_articles')
    op.drop_table('kb_articles')
    op.drop_column('kb_documents', 'origin')
