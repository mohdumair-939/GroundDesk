"""SQLAlchemy engine/session setup and a simple database health check."""

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

engine = None
SessionLocal = None

if settings.database_url:
    engine = create_engine(
        settings.sqlalchemy_database_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 10},
    )
    SessionLocal = sessionmaker(bind=engine, autoflush=False)


def check_database() -> dict:
    """Return the database connection status and whether pgvector is enabled."""
    if engine is None:
        return {"database": "not_configured", "pgvector": "unknown"}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            has_vector = conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            ).first()
    except Exception:
        # Log full details server-side; don't leak connection info in the response.
        logger.exception("Database health check failed")
        return {"database": "error", "pgvector": "unknown"}

    return {"database": "connected", "pgvector": "enabled" if has_vector else "not_enabled"}
