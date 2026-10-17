"""Seed departments, technicians and demo user accounts.

Safe to run repeatedly (matches on name / email). Demo accounts get DEMO_PASSWORD only when
they are first created; existing passwords are never overwritten.

Run from backend/:  python -m app.seed
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Department, Role, Technician, User
from app.security import hash_password

DEPARTMENTS = {
    "Network Support": (
        "VPN, Wi-Fi, internet and shared drives",
        [("Arjun Mehta", "arjun.mehta"), ("Priya Nair", "priya.nair")],
    ),
    "Application Support": (
        "Software, email and Office applications",
        [("Sneha Iyer", "sneha.iyer"), ("Karan Malhotra", "karan.malhotra")],
    ),
    "Hardware Support": (
        "Laptops, desktops, printers and peripherals",
        [("Vikram Singh", "vikram.singh"), ("Ananya Das", "ananya.das")],
    ),
    "Identity & Access": (
        "Passwords, account lockouts, MFA and permissions",
        [("Rohit Verma", "rohit.verma"), ("Meera Joshi", "meera.joshi")],
    ),
    "General IT": ("Anything that does not fit another team", [("Farhan Ali", "farhan.ali")]),
}


ADMINS = [("Help Desk Admin", "admin@helpdesk.local")]
EMPLOYEES = [("Asha Rao", "asha.rao@helpdesk.local"), ("Ravi Kumar", "ravi.kumar@helpdesk.local")]


def _ensure_user(db: Session, name: str, email: str, role: Role, technician_id: int | None = None) -> bool:
    if db.scalars(select(User).where(User.email == email)).first() is not None:
        return False
    db.add(
        User(
            name=name,
            email=email,
            password_hash=hash_password(settings.demo_password),
            role=role,
            technician_id=technician_id,
        )
    )
    return True


def seed(db: Session) -> dict:
    created = {"departments": 0, "technicians": 0, "users": 0}
    for name, (description, techs) in DEPARTMENTS.items():
        dept = db.scalars(select(Department).where(Department.name == name)).first()
        if dept is None:
            dept = Department(name=name, description=description)
            db.add(dept)
            db.flush()
            created["departments"] += 1
        for tech_name, handle in techs:
            email = f"{handle}@helpdesk.local"
            tech = db.scalars(select(Technician).where(Technician.email == email)).first()
            if tech is None:
                tech = Technician(name=tech_name, email=email, department_id=dept.id)
                db.add(tech)
                db.flush()
                created["technicians"] += 1
            created["users"] += _ensure_user(db, tech_name, email, Role.TECHNICIAN, tech.id)
    for name, email in ADMINS:
        created["users"] += _ensure_user(db, name, email, Role.ADMIN)
    for name, email in EMPLOYEES:
        created["users"] += _ensure_user(db, name, email, Role.EMPLOYEE)
    db.commit()
    return created


def main() -> int:
    from app.database import SessionLocal

    if SessionLocal is None:
        print("DATABASE_URL is not configured", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        print(f"Seed complete: {seed(db)} created")
    return 0


if __name__ == "__main__":
    sys.exit(main())
