"""Rule-based, explainable routing of escalated tickets.

1. Category rule: the ticket category maps straight to a department.
2. Keyword fallback (category "Other"): keywords in the title/description pick the department.
3. Default: General IT.
The ticket then goes to the department's least-loaded active technician
(fewest ASSIGNED / IN_PROGRESS tickets; ties go to the longest-serving technician, lowest id).
"""

import re
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Assignment, Category, Department, Technician, Ticket, TicketStatus, User
from app.ticket_service import add_note, change_status

DEFAULT_DEPARTMENT = "General IT"

CATEGORY_RULES: dict[Category, str] = {
    Category.NETWORK: "Network Support",
    Category.SOFTWARE: "Application Support",
    Category.EMAIL: "Application Support",
    Category.HARDWARE: "Hardware Support",
    Category.ACCOUNT_ACCESS: "Identity & Access",
}

# Checked in this order; the department with the most keyword hits wins (title hits count double).
KEYWORD_RULES: dict[str, list[str]] = {
    "Network Support": ["vpn", "wifi", "wi-fi", "wireless", "internet", "network", "router", "ethernet", "shared drive"],
    "Identity & Access": ["password", "login", "log in", "sign in", "locked", "lockout", "mfa", "authenticator", "access denied", "permission"],
    "Hardware Support": ["printer", "laptop", "monitor", "keyboard", "mouse", "fan", "battery", "screen", "projector", "hardware", "charger"],
    "Application Support": ["outlook", "email", "e-mail", "teams", "zoom", "excel", "word", "install", "software", "application", "licence", "license"],
}

ACTIVE_STATUSES = (TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS)


@dataclass
class Route:
    department: str
    rule: str


def _keyword_hits(text: str, keywords: list[str]) -> list[str]:
    return [k for k in keywords if re.search(rf"\b{re.escape(k)}\b", text)]


def choose_department(ticket: Ticket) -> Route:
    if ticket.category in CATEGORY_RULES:
        dept = CATEGORY_RULES[ticket.category]
        return Route(dept, f"Category rule: {ticket.category.value} → {dept}")

    title, body = ticket.title.lower(), ticket.description.lower()
    best: tuple[int, str, list[str]] | None = None
    for dept, keywords in KEYWORD_RULES.items():
        title_hits = _keyword_hits(title, keywords)
        body_hits = _keyword_hits(body, keywords)
        score = 2 * len(title_hits) + len(body_hits)
        if score and (best is None or score > best[0]):
            best = (score, dept, list(dict.fromkeys(title_hits + body_hits)))
    if best:
        _, dept, hits = best
        words = ", ".join(f"'{h}'" for h in hits[:3])
        return Route(dept, f"Keyword rule: {words} → {dept}")

    return Route(DEFAULT_DEPARTMENT, f"Default rule: no category or keyword match → {DEFAULT_DEPARTMENT}")


def technician_loads(db: Session, department_id: int) -> list[tuple[Technician, int]]:
    """Active technicians in a department with their open ticket counts, least loaded first."""
    open_count = (
        select(func.count(Assignment.id))
        .join(Ticket, Ticket.id == Assignment.ticket_id)
        .where(Assignment.technician_id == Technician.id, Ticket.status.in_(ACTIVE_STATUSES))
        .correlate(Technician)
        .scalar_subquery()
    )
    rows = db.execute(
        select(Technician, open_count.label("load"))
        .where(Technician.department_id == department_id, Technician.active.is_(True))
        .order_by(open_count, Technician.id)
    ).all()
    return [(tech, load) for tech, load in rows]


def assign_ticket(db: Session, ticket: Ticket) -> Assignment:
    """Route an ESCALATED ticket and move it to ASSIGNED."""
    route = choose_department(ticket)
    dept = db.scalars(select(Department).where(Department.name == route.department)).one()

    loads = technician_loads(db, dept.id)
    if loads:
        tech, load = loads[0]
        rule = f"{route.rule}; least-loaded technician ({load} open)"
    else:
        tech, rule = None, f"{route.rule}; no active technician, queued for the team"

    assignment = ticket.assignment  # reused when an admin reopens a previously routed ticket
    if assignment is None:
        assignment = Assignment(ticket_id=ticket.id, department_id=dept.id)
        db.add(assignment)
    assignment.department_id = dept.id
    assignment.technician_id = tech.id if tech else None
    assignment.rule_matched = rule
    assignment.assigned_at = func.now()
    who = f"{tech.name} ({dept.name})" if tech else dept.name
    change_status(db, ticket, TicketStatus.ASSIGNED, f"Assigned to {who}. {rule}")
    return assignment


def reassign_ticket(db: Session, ticket: Ticket, technician: Technician, actor: User, note: str | None = None) -> Assignment:
    """Admin override: move the ticket to another technician (and their department)."""
    rule = (f"Reassigned by {actor.name} (admin)" + (f": {note}" if note else ""))[:255]  # column size
    if ticket.assignment is None:
        ticket.assignment = Assignment(department_id=technician.department_id, technician_id=technician.id, rule_matched=rule)
    else:
        ticket.assignment.department_id = technician.department_id
        ticket.assignment.technician_id = technician.id
        ticket.assignment.rule_matched = rule
        ticket.assignment.assigned_at = func.now()
    message = f"Reassigned to {technician.name} ({technician.department.name}) by {actor.name}" + (f". {note}" if note else "")
    if ticket.status == TicketStatus.ASSIGNED:
        add_note(db, ticket, message, actor)
    else:
        change_status(db, ticket, TicketStatus.ASSIGNED, message, actor)
    return ticket.assignment
