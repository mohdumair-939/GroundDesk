"""Admin user management: list accounts, enable/disable them, reset passwords."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Role, User
from app.schemas import UserOut, UserUpdate
from app.security import hash_password, require_roles

router = APIRouter(prefix="/users", tags=["users"])
admin_only = require_roles(Role.ADMIN)


@router.get("", response_model=list[UserOut])
def list_users(role: Role | None = None, q: str | None = Query(None, max_length=100), db: Session = Depends(get_db), _=Depends(admin_only)):
    stmt = select(User).order_by(User.role, User.name)
    if role:
        stmt = stmt.where(User.role == role)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(User.name.ilike(like) | User.email.ilike(like))
    return db.scalars(stmt).all()


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if payload.active is False and user.id == admin.id:
        raise HTTPException(status.HTTP_409_CONFLICT, "You cannot disable your own account")
    if payload.active is not None:
        user.active = payload.active
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    db.commit()
    return user
