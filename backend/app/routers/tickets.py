"""Ticket CRUD, status and AI suggestion endpoints."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app import database
from app.assignment import assign_ticket
from app.database import get_db
from app.llm_client import LLMError
from app.models import Assignment, Category, Priority, Ticket, TicketStatus
from app.rag import suggest_for_ticket
from app.schemas import FeedbackIn, StatusHistoryOut, StatusUpdate, TicketCreate, TicketDetail, TicketOut
from app.ticket_service import InvalidTransition, change_status, create_ticket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["tickets"])

# PATCH /status is for technician moves only; the other statuses are set by the
# suggestion and feedback endpoints so the AI and routing records stay consistent.
TECHNICIAN_MOVES = {TicketStatus.IN_PROGRESS, TicketStatus.CLOSED}
ASSIGNMENT_LOAD = selectinload(Ticket.assignment).options(
    selectinload(Assignment.department), selectinload(Assignment.technician)
)


def get_ticket_or_404(db: Session, ticket_id: int, lock: bool = False) -> Ticket:
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    if lock:
        # Serialises concurrent actions on one ticket (e.g. auto-suggest vs. a manual retry).
        stmt = stmt.with_for_update(of=Ticket)
    ticket = db.scalars(
        stmt.options(selectinload(Ticket.history), selectinload(Ticket.suggestions), ASSIGNMENT_LOAD)
    ).first()
    if ticket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return ticket


def reload_ticket(db: Session, ticket_id: int) -> Ticket:
    db.expire_all()
    return get_ticket_or_404(db, ticket_id)


def auto_suggest(ticket_id: int) -> None:
    """Background task run after a ticket is created. Failures leave the ticket OPEN."""
    with database.SessionLocal() as db:
        try:
            ticket = get_ticket_or_404(db, ticket_id, lock=True)
            if ticket.status == TicketStatus.OPEN:
                suggest_for_ticket(db, ticket)
                db.commit()
        except Exception:
            db.rollback()
            logger.exception("Automatic suggestion failed for ticket %s", ticket_id)


@router.post("", response_model=TicketDetail, status_code=status.HTTP_201_CREATED)
def create(payload: TicketCreate, background: BackgroundTasks, db: Session = Depends(get_db)):
    ticket = create_ticket(db, **payload.model_dump())
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
):
    stmt = select(Ticket).options(ASSIGNMENT_LOAD)
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
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return get_ticket_or_404(db, ticket_id)


@router.get("/{ticket_id}/history", response_model=list[StatusHistoryOut])
def get_history(ticket_id: int, db: Session = Depends(get_db)):
    return get_ticket_or_404(db, ticket_id).history


@router.patch("/{ticket_id}/status", response_model=TicketDetail)
def update_status(ticket_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    if payload.status not in TECHNICIAN_MOVES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{payload.status.value} is set by the suggestion/feedback workflow, not by a status update",
        )
    ticket = get_ticket_or_404(db, ticket_id, lock=True)
    try:
        change_status(db, ticket, payload.status, payload.note)
    except InvalidTransition as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    db.commit()
    return reload_ticket(db, ticket_id)


@router.post("/{ticket_id}/suggest", response_model=TicketDetail)
def suggest(ticket_id: int, db: Session = Depends(get_db)):
    """Run the RAG pipeline for an OPEN ticket (normally done automatically after creation)."""
    ticket = get_ticket_or_404(db, ticket_id, lock=True)
    if ticket.status != TicketStatus.OPEN:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Suggestions are generated for OPEN tickets; this ticket is {ticket.status.value}",
        )
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
def feedback(ticket_id: int, payload: FeedbackIn, db: Session = Depends(get_db)):
    """User feedback on the suggestion. Yes -> RESOLVED. No -> ESCALATED, then routed -> ASSIGNED.

    "No" is also accepted for an OPEN ticket, so users are never stuck if the AI is unavailable.
    """
    ticket = get_ticket_or_404(db, ticket_id, lock=True)
    allowed = {TicketStatus.SUGGESTION_PROVIDED} | (set() if payload.resolved else {TicketStatus.OPEN})
    if ticket.status not in allowed:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Feedback is not accepted for a {ticket.status.value} ticket"
        )

    if ticket.suggestion:
        ticket.suggestion.feedback_resolved = payload.resolved
        ticket.suggestion.feedback_comment = payload.comment

    comment = f" Comment: {payload.comment}" if payload.comment else ""
    if payload.resolved:
        change_status(db, ticket, TicketStatus.RESOLVED, f"User confirmed the AI suggestion fixed the issue.{comment}")
    else:
        change_status(db, ticket, TicketStatus.ESCALATED, f"User reported the issue is not resolved.{comment}")
        assign_ticket(db, ticket)
    db.commit()
    return reload_ticket(db, ticket_id)
