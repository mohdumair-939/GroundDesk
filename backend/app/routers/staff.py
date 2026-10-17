"""Departments and technicians (read-only; seeded by app.seed)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.assignment import technician_loads
from app.database import get_db
from app.models import Department
from app.schemas import DepartmentOut, TechnicianOut

router = APIRouter(tags=["staff"])


def _departments(db: Session) -> list[DepartmentOut]:
    departments = db.scalars(
        select(Department).options(selectinload(Department.technicians)).order_by(Department.id)
    ).all()
    result = []
    for dept in departments:
        loads = sorted(technician_loads(db, dept.id), key=lambda tl: tl[0].id)
        result.append(
            DepartmentOut(
                id=dept.id,
                name=dept.name,
                description=dept.description,
                technicians=[
                    TechnicianOut(id=t.id, name=t.name, email=t.email, department=dept, open_tickets=load)
                    for t, load in loads
                ],
            )
        )
    return result


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return _departments(db)


@router.get("/technicians", response_model=list[TechnicianOut])
def list_technicians(db: Session = Depends(get_db)):
    return [t for d in _departments(db) for t in d.technicians]
