"""Seed departments and technicians. Safe to run repeatedly (matches on name / email).

Run from backend/:  python -m app.seed
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Department, Technician

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


def seed(db: Session) -> dict:
    created = {"departments": 0, "technicians": 0}
    for name, (description, techs) in DEPARTMENTS.items():
        dept = db.scalars(select(Department).where(Department.name == name)).first()
        if dept is None:
            dept = Department(name=name, description=description)
            db.add(dept)
            db.flush()
            created["departments"] += 1
        for tech_name, handle in techs:
            email = f"{handle}@helpdesk.local"
            if db.scalars(select(Technician).where(Technician.email == email)).first() is None:
                db.add(Technician(name=tech_name, email=email, department_id=dept.id))
                created["technicians"] += 1
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
