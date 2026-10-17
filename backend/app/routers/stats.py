"""Dashboard numbers for admins: tickets by status and category, AI outcomes, and per-department load."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AISuggestion, Assignment, Department, Role, Ticket, TicketStatus, TicketStatusHistory
from app.security import require_roles

router = APIRouter(tags=["stats"], dependencies=[Depends(require_roles(Role.ADMIN))])
S = TicketStatus


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    by_status = {s.value: 0 for s in TicketStatus}
    for status, n in db.execute(select(Ticket.status, func.count()).group_by(Ticket.status)):
        by_status[status.value] = n

    by_category = {
        category.value: n
        for category, n in db.execute(select(Ticket.category, func.count()).group_by(Ticket.category).order_by(func.count().desc()))
    }

    # AI outcome. RESOLVED is only reachable through the employee confirming the AI suggestion;
    # "escalated" counts every ticket that was ever escalated (so later states still count).
    escalated = db.scalar(
        select(func.count(func.distinct(TicketStatusHistory.ticket_id))).where(TicketStatusHistory.new_status == S.ESCALATED)
    )
    answered = db.scalar(select(func.count(func.distinct(AISuggestion.ticket_id))).where(AISuggestion.answered.is_(True)))
    with_suggestion = db.scalar(select(func.count(func.distinct(AISuggestion.ticket_id))))
    resolved_by_ai = by_status[S.RESOLVED.value]
    awaiting_answer = by_status[S.SUGGESTION_PROVIDED.value] + by_status[S.OPEN.value]

    # Average time from creation to the (last) CLOSED entry, for closed tickets.
    closed_at = (
        select(TicketStatusHistory.ticket_id, func.max(TicketStatusHistory.changed_at).label("closed_at"))
        .where(TicketStatusHistory.new_status == S.CLOSED)
        .group_by(TicketStatusHistory.ticket_id)
        .subquery()
    )
    avg_close_seconds = db.scalar(
        select(func.avg(func.extract("epoch", closed_at.c.closed_at - Ticket.created_at)))
        .join(closed_at, closed_at.c.ticket_id == Ticket.id)
        .where(Ticket.status == S.CLOSED)
    )

    departments = []
    rows = db.execute(
        select(Department.name, Ticket.status, func.count())
        .join(Assignment, Assignment.department_id == Department.id)
        .join(Ticket, Ticket.id == Assignment.ticket_id)
        .group_by(Department.name, Ticket.status)
    ).all()
    for dept in db.scalars(select(Department).order_by(Department.id)):
        counts = {status.value: n for name, status, n in rows if name == dept.name}
        departments.append(
            {
                "name": dept.name,
                "open": counts.get(S.ASSIGNED.value, 0) + counts.get(S.IN_PROGRESS.value, 0),
                "awaiting_approval": counts.get(S.PENDING_APPROVAL.value, 0),
                "closed": counts.get(S.CLOSED.value, 0),
                "total": sum(counts.values()),
            }
        )

    return {
        "total": sum(by_status.values()),
        "by_status": by_status,
        "by_category": by_category,
        "ai": {
            "with_suggestion": with_suggestion,
            "answered": answered,
            "no_reliable_answer": with_suggestion - answered,
            "resolved_by_ai": resolved_by_ai,
            "escalated": escalated,
            "awaiting_answer": awaiting_answer,
        },
        "avg_minutes_to_close": round(float(avg_close_seconds) / 60) if avg_close_seconds is not None else None,
        "departments": departments,
    }
