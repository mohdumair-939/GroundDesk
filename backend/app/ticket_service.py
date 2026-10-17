"""Ticket lifecycle rules. Every status change goes through change_status so it is logged."""

from sqlalchemy.orm import Session

from app.models import Ticket, TicketStatus, TicketStatusHistory

S = TicketStatus

# OPEN -> SUGGESTION_PROVIDED -> RESOLVED, or -> ESCALATED -> ASSIGNED -> IN_PROGRESS -> CLOSED
ALLOWED_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    S.OPEN: {S.SUGGESTION_PROVIDED, S.ESCALATED},
    S.SUGGESTION_PROVIDED: {S.RESOLVED, S.ESCALATED},
    S.ESCALATED: {S.ASSIGNED},
    S.ASSIGNED: {S.IN_PROGRESS},
    S.IN_PROGRESS: {S.CLOSED},
    S.RESOLVED: set(),
    S.CLOSED: set(),
}


class InvalidTransition(ValueError):
    pass


def create_ticket(db: Session, **fields) -> Ticket:
    ticket = Ticket(status=S.OPEN, **fields)
    db.add(ticket)
    db.flush()  # assigns the id used for the human-readable code
    ticket.ticket_code = f"HD-{ticket.id:04d}"
    db.add(TicketStatusHistory(ticket_id=ticket.id, old_status=None, new_status=S.OPEN, note="Ticket created"))
    return ticket


def change_status(db: Session, ticket: Ticket, new_status: TicketStatus, note: str | None = None) -> None:
    if new_status not in ALLOWED_TRANSITIONS[ticket.status]:
        raise InvalidTransition(f"Cannot move ticket from {ticket.status.value} to {new_status.value}")
    db.add(
        TicketStatusHistory(ticket_id=ticket.id, old_status=ticket.status, new_status=new_status, note=note)
    )
    ticket.status = new_status
