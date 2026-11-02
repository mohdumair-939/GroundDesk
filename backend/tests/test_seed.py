"""Seeding retires technician records left over from before the STAFF_DOMAIN move."""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Assignment, Technician, TicketStatusHistory
from app.seed import seed

FAN_TICKET = {
    "title": "Laptop fan making grinding noise",
    "description": "The fan in my laptop makes a loud grinding noise and the bottom gets hot.",
    "category": "Hardware",
}


def escalate(employee):
    tid = employee.post("/tickets", json=FAN_TICKET).json()["id"]
    return employee.post(f"/tickets/{tid}/feedback", json={"resolved": False}).json()


def test_seed_retires_duplicate_technician_records(employee, admin, login, kb):
    open_ticket = escalate(employee)
    closed_ticket = escalate(employee)
    with SessionLocal() as db:
        real = db.scalars(select(Technician).where(Technician.email == "vikram.singh@grounddesk.com")).one()
        legacy = Technician(name="Vikram Singh", email="vikram.singh@helpdesk.local", department_id=real.department_id)
        db.add(legacy)
        db.flush()
        legacy_id = legacy.id
        # The production state: tickets routed to the legacy record, which has no login.
        for t in (open_ticket, closed_ticket):
            db.scalars(select(Assignment).where(Assignment.ticket_id == t["id"])).one().technician_id = legacy_id
        db.commit()
    admin.patch(f"/tickets/{closed_ticket['id']}/status", json={"status": "CLOSED", "note": "Done offline"})
    assert legacy_id in [t["id"] for t in admin.get("/technicians").json()]

    try:
        with SessionLocal() as db:
            assert seed(db)["legacy_technicians_retired"] == 1
        with SessionLocal() as db:
            assert db.get(Technician, legacy_id).active is False
            moved = db.scalars(select(Assignment).where(Assignment.ticket_id.in_([open_ticket["id"], closed_ticket["id"]]))).all()
            assert {a.technician_id for a in moved} == {real.id}
            notes = db.scalars(select(TicketStatusHistory.ticket_id).where(TicketStatusHistory.note.like("Moved from a retired duplicate%"))).all()
            assert notes == [open_ticket["id"]]  # closed tickets move silently

        # The real technician can now sign in and see the ticket; the duplicate is gone from routing and lists.
        tech = login("vikram.singh@grounddesk.com")
        assert tech.get(f"/tickets/{open_ticket['id']}").status_code == 200
        assert legacy_id not in [t["id"] for t in admin.get("/technicians").json()]
        with SessionLocal() as db:  # idempotent
            assert seed(db)["legacy_technicians_retired"] == 0
    finally:
        with SessionLocal() as db:
            db.delete(db.get(Technician, legacy_id))
            db.commit()
