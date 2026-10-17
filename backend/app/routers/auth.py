"""Sign in (per role), employee self-registration, and the current user."""

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Role, User
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut
from app.security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

ROLE_LABELS = {Role.EMPLOYEE: "Employee", Role.TECHNICIAN: "Technician", Role.ADMIN: "Admin"}


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalars(select(User).where(User.email == payload.email.lower())).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if user.role != payload.role:
        # Each email has exactly one role; signing in through another role's option is refused.
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"This account can't sign in through the {ROLE_LABELS[payload.role]} login. "
            f"Please use the {ROLE_LABELS[user.role]} login.",
        )
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled. Contact the help desk admin.")
    return TokenOut(access_token=create_token(user), user=user)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """Employees can create their own account. Technician and admin accounts are not self-service."""
    email = payload.email
    # Emails are unique across all roles, so staff emails can never become employee accounts.
    if db.scalars(select(User).where(User.email == email)).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    try:
        validate_email(email, check_deliverability=False)
    except EmailNotValidError as exc:
        raise HTTPException(422, f"Invalid email address: {exc}") from exc
    user = User(name=payload.name, email=email, password_hash=hash_password(payload.password), role=Role.EMPLOYEE)
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_token(user), user=user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
