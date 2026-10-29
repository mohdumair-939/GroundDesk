"""Pydantic request/response models."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.models import Category, Confidence, Priority, Role, TicketStatus

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=120)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=20, max_length=5000)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
RequiredNote = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=500)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
LoginEmail = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=254)]


# ---------------------------------------------------------------- auth and users


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Plain text: sign-in only has to match a stored account (technicians and admins use STAFF_DOMAIN).
    email: LoginEmail
    password: str
    role: Role  # the login option the user picked; must match the account's role


class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Name
    email: LoginEmail  # format is validated after the duplicate check, see routers/auth.py
    password: Password


class UserRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: Role


class UserOut(UserRef):
    email: str
    technician_id: int | None
    active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: bool | None = None
    password: Password | None = None


# ---------------------------------------------------------------- tickets


class TicketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    description: Description
    category: Category
    priority: Priority = Priority.MEDIUM
    # The requester's name and email come from the signed-in account.


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TicketStatus
    note: Note | None = None


class ClosureIn(BaseModel):
    """The employee's answer when the technician marks the ticket solved."""

    model_config = ConfigDict(extra="forbid")

    approved: bool
    comment: Note | None = None


class TicketUpdate(BaseModel):
    """Admin edits."""

    model_config = ConfigDict(extra="forbid")

    priority: Priority | None = None
    category: Category | None = None


class ReassignIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    technician_id: int
    note: Note | None = None


class NoteIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: RequiredNote


class FeedbackIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    resolved: bool
    comment: Note | None = None


class DepartmentRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TechnicianRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    department: DepartmentRef
    technician: TechnicianRef | None
    rule_matched: str
    assigned_at: datetime


class TechnicianOut(TechnicianRef):
    department: DepartmentRef
    open_tickets: int


class DepartmentOut(BaseModel):
    id: int
    name: str
    description: str
    technicians: list[TechnicianOut]


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: TicketStatus | None
    new_status: TicketStatus
    changed_at: datetime
    note: str | None
    changed_by: UserRef | None  # None = system (AI, automatic routing)


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_code: str
    title: str
    description: str
    category: Category
    priority: Priority
    status: TicketStatus
    user_name: str
    user_email: str
    created_at: datetime
    updated_at: datetime
    assignment: AssignmentOut | None = None


class SourceOut(BaseModel):
    n: int
    document_id: int
    title: str
    category: str
    source: str
    chunk_id: int
    score: float


class SuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    answered: bool
    suggestion_text: str
    sources: list[SourceOut]
    confidence: Confidence | None
    top_score: float | None
    provider: str
    created_at: datetime
    feedback_resolved: bool | None
    feedback_comment: str | None


class TicketDetail(TicketOut):
    history: list[StatusHistoryOut] = Field(default_factory=list)
    suggestion: SuggestionOut | None = None  # latest AI suggestion, if any
