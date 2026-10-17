"""Database models. Enums are stored as plain strings so they are easy to read and migrate."""

import enum
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.llm_client import EMBEDDING_DIM


class Category(str, enum.Enum):
    NETWORK = "Network"
    SOFTWARE = "Software"
    HARDWARE = "Hardware"
    ACCOUNT_ACCESS = "Account/Access"
    EMAIL = "Email"
    OTHER = "Other"


class Priority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class Confidence(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    SUGGESTION_PROVIDED = "SUGGESTION_PROVIDED"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_APPROVAL = "PENDING_APPROVAL"  # technician marked solved; waiting for the employee
    CLOSED = "CLOSED"


class Role(str, enum.Enum):
    EMPLOYEE = "employee"
    TECHNICIAN = "technician"
    ADMIN = "admin"


def _str_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        values_callable=lambda e: [m.value for m in e],
        length=32,
        validate_strings=True,
    )


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_code: Mapped[str | None] = mapped_column(String(16), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[Category] = mapped_column(_str_enum(Category, "category"), index=True)
    priority: Mapped[Priority] = mapped_column(
        _str_enum(Priority, "priority"), default=Priority.MEDIUM
    )
    status: Mapped[TicketStatus] = mapped_column(
        _str_enum(TicketStatus, "ticket_status"), default=TicketStatus.OPEN, index=True
    )
    user_name: Mapped[str] = mapped_column(String(100))
    user_email: Mapped[str] = mapped_column(String(254))
    # The account that raised the ticket (null only for tickets created before logins existed).
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    history: Mapped[list["TicketStatusHistory"]] = relationship(
        back_populates="ticket",
        order_by="TicketStatusHistory.id",
        cascade="all, delete-orphan",
    )
    suggestions: Mapped[list["AISuggestion"]] = relationship(
        back_populates="ticket",
        order_by="AISuggestion.id",
        cascade="all, delete-orphan",
    )

    assignment: Mapped["Assignment | None"] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", uselist=False
    )

    @property
    def suggestion(self) -> "AISuggestion | None":
        """The latest AI suggestion (a ticket normally has at most one)."""
        return self.suggestions[-1] if self.suggestions else None


class TicketStatusHistory(Base):
    __tablename__ = "ticket_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    old_status: Mapped[TicketStatus | None] = mapped_column(_str_enum(TicketStatus, "ticket_status"))
    new_status: Mapped[TicketStatus] = mapped_column(_str_enum(TicketStatus, "ticket_status"))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    note: Mapped[str | None] = mapped_column(String(500))
    # Who made the change; null means the system (AI suggestion, automatic routing).
    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    ticket: Mapped[Ticket] = relationship(back_populates="history")
    changed_by: Mapped["User | None"] = relationship()


class AISuggestion(Base):
    """One RAG run for a ticket. answered=False means the guard found no reliable solution."""

    __tablename__ = "ai_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    answered: Mapped[bool] = mapped_column(Boolean)
    suggestion_text: Mapped[str] = mapped_column(Text)
    # [{"n": 1, "document_id", "title", "category", "source", "chunk_id", "score"}, ...]
    sources: Mapped[list] = mapped_column(JSON, default=list)
    confidence: Mapped[Confidence | None] = mapped_column(_str_enum(Confidence, "confidence"))
    top_score: Mapped[float | None] = mapped_column(Float)
    provider: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # User feedback: True = "Yes, this fixed it", False = "No, escalate", None = not given yet.
    feedback_resolved: Mapped[bool | None] = mapped_column(Boolean)
    feedback_comment: Mapped[str | None] = mapped_column(String(500))

    ticket: Mapped[Ticket] = relationship(back_populates="suggestions")


class KBDocument(Base):
    __tablename__ = "kb_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(255), unique=True)  # file name inside /kb
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[Category] = mapped_column(_str_enum(Category, "category"))
    content_hash: Mapped[str] = mapped_column(String(64))
    embedding_model: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chunks: Mapped[list["KBChunk"]] = relationship(
        back_populates="document", order_by="KBChunk.chunk_index", cascade="all, delete-orphan"
    )


class KBChunk(Base):
    __tablename__ = "kb_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("kb_documents.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    chunk_text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))

    document: Mapped[KBDocument] = relationship(back_populates="chunks")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")

    technicians: Mapped[list["Technician"]] = relationship(
        back_populates="department", order_by="Technician.id"
    )


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    department: Mapped[Department] = relationship(back_populates="technicians")


class Assignment(Base):
    """Where an escalated ticket was routed and why (rule_matched is shown in the UI)."""

    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("technicians.id"), index=True)
    rule_matched: Mapped[str] = mapped_column(String(255))
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped[Ticket] = relationship(back_populates="assignment")
    department: Mapped[Department] = relationship()
    technician: Mapped[Technician | None] = relationship()


class User(Base):
    """A login. Email is unique across all roles, so one person has exactly one role."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(_str_enum(Role, "role"))
    # Set for technician accounts: the Technician record they act as.
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("technicians.id"), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    technician: Mapped[Technician | None] = relationship()
