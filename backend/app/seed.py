"""Seed departments, technicians and demo user accounts.

Safe to run repeatedly (matches on name / email). Demo accounts get DEMO_PASSWORD only when
they are first created; existing passwords are never overwritten.

Run from backend/:  python -m app.seed
                    python -m app.seed --reset-demo-passwords   (set every seeded account's
                                                                 password to DEMO_PASSWORD)
"""

import argparse
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


MIN_PASSWORD = 8


def _demo_password_ok() -> bool:
    return len(settings.demo_password) >= MIN_PASSWORD


def _ensure_user(db: Session, name: str, email: str, role: Role, technician_id: int | None = None) -> bool:
    if db.scalars(select(User).where(User.email == email)).first() is not None:
        return False
    if not _demo_password_ok():
        return False  # never create accounts with an empty or weak shared password
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


def seeded_emails() -> list[str]:
    techs = [f"{handle}@helpdesk.local" for _, (_, people) in DEPARTMENTS.items() for _, handle in people]
    return techs + [email for _, email in ADMINS + EMPLOYEES]


def reset_demo_passwords(db: Session) -> int:
    """Set every seeded account's password to DEMO_PASSWORD (e.g. after a weak one leaked)."""
    users = db.scalars(select(User).where(User.email.in_(seeded_emails()))).all()
    for user in users:
        user.password_hash = hash_password(settings.demo_password)
    db.commit()
    return len(users)


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed departments, technicians and demo accounts")
    parser.add_argument("--reset-demo-passwords", action="store_true", help="set seeded accounts' passwords to DEMO_PASSWORD")
    args = parser.parse_args()

    from app.database import SessionLocal

    if SessionLocal is None:
        print("DATABASE_URL is not configured", file=sys.stderr)
        return 1
    if not _demo_password_ok():
        print(f"DEMO_PASSWORD is not set (or shorter than {MIN_PASSWORD} characters): demo accounts are not created.", file=sys.stderr)
        if args.reset_demo_passwords:
            return 1
    with SessionLocal() as db:
        if args.reset_demo_passwords:
            print(f"Reset the password of {reset_demo_passwords(db)} seeded accounts to DEMO_PASSWORD")
        else:
            print(f"Seed complete: {seed(db)} created")
    return 0


if __name__ == "__main__":
    sys.exit(main())
