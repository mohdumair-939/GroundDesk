"""Ticket endpoints, with role-based access.

Employees see and act on their own tickets, technicians on tickets assigned to them,
admins on everything. Tickets a user may not see return 404, not 403, so ticket ids
are not leaked.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app import database
from app.assignment import assign_ticket, reassign_ticket
from app.database import get_db
from app.llm_client import LLMError
from app.models import Assignment, Category, Priority, Role, Technician, Ticket, TicketStatus, TicketStatusHistory, User
from app.rag import suggest_for_ticket
from app.schemas import (
    ClosureIn,
    FeedbackIn,
    NoteIn,
    ReassignIn,
    StatusHistoryOut,
    StatusUpdate,
    TicketCreate,
    TicketDetail,
    TicketOut,
    TicketUpdate,
)
from app.security import current_user, require_roles
from app.ticket_service import OPEN_STATUSES, InvalidTransition, add_note, change_status, create_ticket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["tickets"])
S = TicketStatus

ASSIGNMENT_LOAD = selectinload(Ticket.assignment).options(
    selectinload(Assignment.department), selectinload(Assignment.technician)
)
HISTORY_LOAD = selectinload(Ticket.history).selectinload(TicketStatusHistory.changed_by)

# Moves allowed through PATCH /status, per role: {target status: required current status(es)}.
# Everything else is set by the suggestion, feedback, closure and admin endpoints.
STATUS_MOVES = {
    Role.TECHNICIAN: {S.IN_PROGRESS: {S.ASSIGNED}, S.PENDING_APPROVAL: {S.IN_PROGRESS}},
    Role.ADMIN: {S.IN_PROGRESS: {S.ASSIGNED}, S.PENDING_APPROVAL: {S.IN_PROGRESS}, S.CLOSED: OPEN_STATUSES},
}


# ---------------------------------------------------------------- helpers


def can_view(user: User, ticket: Ticket) -> bool:
    if user.role == Role.ADMIN:
        return True
    if user.role == Role.EMPLOYEE:
        return ticket.created_by_id == user.id
    return (
        user.technician_id is not None
        and ticket.assignment is not None
        and ticket.assignment.technician_id == user.technician_id
    )


def is_owner(user: User, ticket: Ticket) -> bool:
    return user.role == Role.EMPLOYEE and ticket.created_by_id == user.id


def load_ticket(db: Session, ticket_id: int, user: User | None = None, lock: bool = False) -> Ticket:
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    if lock:
        # Serialises concurrent actions on one ticket (e.g. auto-suggest vs. a manual retry).
        stmt = stmt.with_for_update(of=Ticket)
    ticket = db.scalars(stmt.options(HISTORY_LOAD, selectinload(Ticket.suggestions), ASSIGNMENT_LOAD)).first()
    if ticket is None or (user is not None and not can_view(user, ticket)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return ticket


def reload_ticket(db: Session, ticket_id: int) -> Ticket:
    db.expire_all()
    return load_ticket(db, ticket_id)


def conflict(message: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, message)


def forbidden(message: str = "You do not have access to this action") -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, message)


def auto_suggest(ticket_id: int) -> None:
    """Background task run after a ticket is created. Failures leave the ticket OPEN."""
    with database.SessionLocal() as db:
        try:
            ticket = load_ticket(db, ticket_id, lock=True)
            if ticket.status == S.OPEN:
                suggest_for_ticket(db, ticket)
                db.commit()
        except Exception:
            db.rollback()
            logger.exception("Automatic suggestion failed for ticket %s", ticket_id)


# ---------------------------------------------------------------- create and read


@router.post("", response_model=TicketDetail, status_code=status.HTTP_201_CREATED)
def create(
    payload: TicketCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.EMPLOYEE)),
):
    ticket = create_ticket(db, created_by=user, user_name=user.name, user_email=user.email, **payload.model_dump())
    db.commit()
    background.add_task(auto_suggest, ticket.id)
    return reload_ticket(db, ticket.id)


@router.get("", response_model=list[TicketOut])
def list_tickets(
    status_: TicketStatus | None = Query(None, alias="status"),
    category: Category | None = None,
    priority: Priority | None = None,
    q: str | None = Query(None, max_length=100, description="Search in code, title or email"),
    technician_id: int | None = None,
    department_id: int | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Employees get their own tickets, technicians their assigned tickets, admins all tickets."""
    stmt = select(Ticket).options(ASSIGNMENT_LOAD)
    if user.role == Role.EMPLOYEE:
        stmt = stmt.where(Ticket.created_by_id == user.id)
    elif user.role == Role.TECHNICIAN:
        technician_id = user.technician_id or -1
        department_id = None

    if technician_id is not None or department_id is not None:
        stmt = stmt.join(Assignment, Assignment.ticket_id == Ticket.id)
        if technician_id is not None:
            stmt = stmt.where(Assignment.technician_id == technician_id)
        if department_id is not None:
            stmt = stmt.where(Assignment.department_id == department_id)
    if status_:
        stmt = stmt.where(Ticket.status == status_)
    if category:
        stmt = stmt.where(Ticket.category == category)
    if priority:
        stmt = stmt.where(Ticket.priority == priority)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Ticket.title.ilike(like), Ticket.ticket_code.ilike(like), Ticket.user_email.ilike(like))
        )
    stmt = stmt.order_by(Ticket.id.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()


@router.get("/{ticket_id}", response_model=TicketDetail)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return load_ticket(db, ticket_id, user)


@router.get("/{ticket_id}/history", response_model=list[StatusHistoryOut])
def get_history(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return load_ticket(db, ticket_id, user).history


# ---------------------------------------------------------------- AI suggestion and employee feedback


@router.post("/{ticket_id}/suggest", response_model=TicketDetail)
def suggest(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Run the RAG pipeline for an OPEN ticket (normally done automatically after creation)."""
    ticket = load_ticket(db, ticket_id, user, lock=True)
    if not (is_owner(user, ticket) or user.role == Role.ADMIN):
        raise forbidden()
    if ticket.status != S.OPEN:
        raise conflict(f"Suggestions are generated for OPEN tickets; this ticket is {ticket.status.value}")
    try:
        suggest_for_ticket(db, ticket)
    except LLMError as exc:
        db.rollback()
        logger.warning("Suggestion failed for ticket %s: %s", ticket_id, exc)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The AI service is unavailable right now. Please try again."
        ) from exc
    db.commit()
    return reload_ticket(db, ticket_id)


@router.post("/{ticket_id}/feedback", response_model=TicketDetail)
def feedback(ticket_id: int, payload: FeedbackIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """The employee's answer to the suggestion. Yes -> RESOLVED. No -> ESCALATED -> routed -> ASSIGNED.

    "No" is also accepted for an OPEN ticket, so employees are never stuck if the AI is unavailable.
    """
    ticket = load_ticket(db, ticket_id, user, lock=True)
    if not is_owner(user, ticket):
        raise forbidden("Only the employee who raised the ticket can answer the suggestion")
    allowed = {S.SUGGESTION_PROVIDED} | (set() if payload.resolved else {S.OPEN})
    if ticket.status not in allowed:
        raise conflict(f"Feedback is not accepted for a {ticket.status.value} ticket")

    if ticket.suggestion:
        ticket.suggestion.feedback_resolved = payload.resolved
        ticket.suggestion.feedback_comment = payload.comment

    comment = f" Comment: {payload.comment}" if payload.comment else ""
    if payload.resolved:
        change_status(db, ticket, S.RESOLVED, f"Employee confirmed the AI suggestion fixed the issue.{comment}", user)
    else:
        change_status(db, ticket, S.ESCALATED, f"Employee reported the issue is not resolved.{comment}", user)
        assign_ticket(db, ticket)
    db.commit()
    return reload_ticket(db, ticket_id)


@router.post("/{ticket_id}/closure", response_model=TicketDetail)
def closure(ticket_id: int, payload: ClosureIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """The employee approves (-> CLOSED) or rejects (-> back to IN_PROGRESS) the technician's fix."""
    ticket = load_ticket(db, ticket_id, user, lock=True)
    if not is_owner(user, ticket):
        raise forbidden("Only the employee who raised the ticket can approve its closure")
    if ticket.status != S.PENDING_APPROVAL:
        raise conflict("This ticket is not waiting for closure approval")
    if not payload.approved and not payload.comment:
        raise HTTPException(422, "Please say what is still not working")

    comment = f" Comment: {payload.comment}" if payload.comment else ""
    if payload.approved:
        change_status(db, ticket, S.CLOSED, f"Employee approved the closure.{comment}", user)
    else:
        change_status(db, ticket, S.IN_PROGRESS, f"Employee rejected the closure.{comment}", user)
    db.commit()
    return reload_ticket(db, ticket_id)


# ---------------------------------------------------------------- technician and admin actions


@router.patch("/{ticket_id}/status", response_model=TicketDetail)
def update_status(ticket_id: int, payload: StatusUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Technician: ASSIGNED -> IN_PROGRESS -> PENDING_APPROVAL ("mark solved", note required).
    Admin: the same, plus force-close any open ticket."""
    ticket = load_ticket(db, ticket_id, user, lock=True)
    moves = STATUS_MOVES.get(user.role)
    if moves is None:
        raise forbidden()
    if payload.status not in moves:
        raise conflict(f"{payload.status.value} cannot be set with a status update")
    if ticket.status not in moves[payload.status]:
        raise conflict(f"Cannot move ticket from {ticket.status.value} to {payload.status.value}")
    if payload.status in (S.PENDING_APPROVAL, S.CLOSED) and not payload.note:
        raise HTTPException(422, "Please add a note describing the resolution")

    note = payload.note
    if payload.status == S.PENDING_APPROVAL:
        note = f"Marked as solved, waiting for the employee to approve closure. Resolution: {payload.note}"
    elif payload.status == S.CLOSED:
        note = f"Closed by admin. {payload.note}"
    try:
        change_status(db, ticket, payload.status, note, user)
    except InvalidTransition as exc:
        raise conflict(str(exc)) from exc
    db.commit()
    return reload_ticket(db, ticket_id)


@router.post("/{ticket_id}/notes", response_model=TicketDetail)
def add_ticket_note(ticket_id: int, payload: NoteIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """A follow-up note in the timeline, by the employee, the assigned technician or an admin."""
    ticket = load_ticket(db, ticket_id, user, lock=True)
    add_note(db, ticket, payload.note, user)
    db.commit()
    return reload_ticket(db, ticket_id)


admin_only = require_roles(Role.ADMIN)


@router.patch("/{ticket_id}", response_model=TicketDetail)
def admin_update(ticket_id: int, payload: TicketUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    ticket = load_ticket(db, ticket_id, lock=True)
    changes = []
    for field in ("priority", "category"):
        new = getattr(payload, field)
        old = getattr(ticket, field)
        if new is not None and new != old:
            setattr(ticket, field, new)
            changes.append(f"{field} {old.value} → {new.value}")
    if changes:
        add_note(db, ticket, "Admin changed " + ", ".join(changes), admin)
        db.commit()
    return reload_ticket(db, ticket_id)


@router.post("/{ticket_id}/reassign", response_model=TicketDetail)
def reassign(ticket_id: int, payload: ReassignIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    ticket = load_ticket(db, ticket_id, lock=True)
    if ticket.status not in (S.ESCALATED, S.ASSIGNED, S.IN_PROGRESS):
        raise conflict(f"A {ticket.status.value} ticket cannot be reassigned")
    technician = db.get(Technician, payload.technician_id)
    if technician is None or not technician.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Technician not found")
    if ticket.assignment and ticket.assignment.technician_id == technician.id:
        raise conflict(f"The ticket is already assigned to {technician.name}")
    reassign_ticket(db, ticket, technician, admin, payload.note)
    db.commit()
    return reload_ticket(db, ticket_id)


@router.post("/{ticket_id}/reopen", response_model=TicketDetail)
def reopen(ticket_id: int, payload: NoteIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    """Reopen a RESOLVED or CLOSED ticket: back to its technician, or routed again if it had none."""
    ticket = load_ticket(db, ticket_id, lock=True)
    if ticket.status not in (S.RESOLVED, S.CLOSED):
        raise conflict("Only resolved or closed tickets can be reopened")
    note = f"Reopened by admin. {payload.note}"
    if ticket.assignment and ticket.assignment.technician_id and ticket.status == S.CLOSED:
        change_status(db, ticket, S.ASSIGNED, note, admin)
    else:
        change_status(db, ticket, S.ESCALATED, note, admin)
        assign_ticket(db, ticket)
    db.commit()
    return reload_ticket(db, ticket_id)
