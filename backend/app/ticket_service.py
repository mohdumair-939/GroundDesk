"""Ticket lifecycle rules. Every status change goes through change_status so it is logged.

Which *role* may make a move is checked in the routers; this module only knows which moves
exist at all.
"""

from sqlalchemy.orm import Session

from app.models import Ticket, TicketStatus, TicketStatusHistory, User

S = TicketStatus

# OPEN -> SUGGESTION_PROVIDED -> RESOLVED
#      or -> ESCALATED -> ASSIGNED -> IN_PROGRESS -> PENDING_APPROVAL -> CLOSED
# The employee can reject a closure (PENDING_APPROVAL -> IN_PROGRESS); an admin can
# reassign, force-close any open ticket, and reopen RESOLVED/CLOSED ones.
ALLOWED_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    S.OPEN: {S.SUGGESTION_PROVIDED, S.ESCALATED, S.CLOSED},
    S.SUGGESTION_PROVIDED: {S.RESOLVED, S.ESCALATED, S.CLOSED},
    S.ESCALATED: {S.ASSIGNED, S.CLOSED},
    S.ASSIGNED: {S.IN_PROGRESS, S.CLOSED},
    S.IN_PROGRESS: {S.PENDING_APPROVAL, S.CLOSED, S.ASSIGNED},  # ASSIGNED = admin reassignment
    S.PENDING_APPROVAL: {S.CLOSED, S.IN_PROGRESS},
    S.RESOLVED: {S.ESCALATED},
    S.CLOSED: {S.ESCALATED, S.ASSIGNED},
}

OPEN_STATUSES = {s for s in TicketStatus if s not in (S.RESOLVED, S.CLOSED)}


NOTE_MAX = 500  # ticket_status_history.note column size


class InvalidTransition(ValueError):
    pass


def _fit(note: str | None) -> str | None:
    """Notes combine a fixed prefix with user text, so trim to the column size."""
    if note is None or len(note) <= NOTE_MAX:
        return note
    return note[: NOTE_MAX - 1] + "…"


def create_ticket(db: Session, created_by: User | None = None, **fields) -> Ticket:
    ticket = Ticket(status=S.OPEN, created_by_id=created_by.id if created_by else None, **fields)
    db.add(ticket)
    db.flush()  # assigns the id used for the human-readable code
    ticket.ticket_code = f"HD-{ticket.id:04d}"
    db.add(
        TicketStatusHistory(
            ticket_id=ticket.id,
            old_status=None,
            new_status=S.OPEN,
            note="Ticket created",
            changed_by_id=created_by.id if created_by else None,
        )
    )
    return ticket


def change_status(
    db: Session, ticket: Ticket, new_status: TicketStatus, note: str | None = None, actor: User | None = None
) -> None:
    """actor=None means the system made the change (AI suggestion, automatic routing)."""
    if new_status not in ALLOWED_TRANSITIONS[ticket.status]:
        raise InvalidTransition(f"Cannot move ticket from {ticket.status.value} to {new_status.value}")
    db.add(
        TicketStatusHistory(
            ticket_id=ticket.id,
            old_status=ticket.status,
            new_status=new_status,
            note=_fit(note),
            changed_by_id=actor.id if actor else None,
        )
    )
    ticket.status = new_status


def add_note(db: Session, ticket: Ticket, note: str, actor: User) -> None:
    """A follow-up note in the timeline without a status change."""
    db.add(
        TicketStatusHistory(
            ticket_id=ticket.id,
            old_status=ticket.status,
            new_status=ticket.status,
            note=_fit(note),
            changed_by_id=actor.id,
        )
    )
