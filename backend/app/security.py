"""Password hashing (stdlib scrypt), signed login tokens (JWT), and role checks."""

import base64
import hashlib
import hmac
import logging
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Role, User

logger = logging.getLogger(__name__)

_SCRYPT = {"n": 2**14, "r": 8, "p": 1, "dklen": 32}
_ALGORITHM = "HS256"

if not settings.jwt_secret:
    # Without a fixed secret, logins stop working after every restart. Fine for local dev only.
    logger.warning("JWT_SECRET is not set; using a temporary secret (users will be logged out on restart)")
_SECRET = settings.jwt_secret or secrets.token_urlsafe(48)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_b64, digest_b64 = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt_b64), **_SCRYPT)
        return hmac.compare_digest(digest, base64.b64decode(digest_b64))
    except (ValueError, TypeError):
        return False


def create_token(user: User) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "role": user.role.value,
        "iat": now,
        "exp": now + timedelta(hours=settings.token_hours),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


_bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> User:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Please sign in again", headers={"WWW-Authenticate": "Bearer"}
    )
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, _SECRET, algorithms=[_ALGORITHM])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None
    # A token is only valid for the role it was issued for, and only while the account is active.
    if user is None or not user.active or user.role.value != payload.get("role"):
        raise unauthorized
    return user


def require_roles(*roles: Role):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this action")
        return user

    return dependency
