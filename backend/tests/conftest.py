"""Test setup: point the app at a separate `<db>_test` database before importing it.

The test database is created on first run (same server, so pgvector is available),
its tables are rebuilt from the models, and every test starts with empty tables.
"""

import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.config import settings as _base_settings

if not _base_settings.database_url:
    raise RuntimeError("Tests need DATABASE_URL in backend/.env")

_url = make_url(_base_settings.sqlalchemy_database_url)
# TEST_DB_NAME lets parallel runs (e.g. two developers) use separate test databases.
TEST_DB = os.environ.get("TEST_DB_NAME") or f"{_url.database}_test"
if TEST_DB == _url.database or "test" not in TEST_DB:
    raise RuntimeError(f"Refusing to use {TEST_DB!r} as a test database")
os.environ["DATABASE_URL"] = _url.set(database=TEST_DB).render_as_string(hide_password=False)
# No network calls in tests: offline hashing embeddings + extractive mock LLM.
# The mock embeddings score lower than Gemini, hence the lower threshold.
os.environ["LLM_PROVIDER"] = "mock"
os.environ["EMBEDDING_PROVIDER"] = "mock"
os.environ["SIMILARITY_THRESHOLD"] = "0.40"

admin = create_engine(_url, isolation_level="AUTOCOMMIT")
with admin.connect() as conn:
    exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": TEST_DB}).first()
    if not exists:
        conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
admin.dispose()

# Import the app only after DATABASE_URL points at the test database.
import importlib  # noqa: E402

import app.config  # noqa: E402

importlib.reload(app.config)
import app.database  # noqa: E402

importlib.reload(app.database)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402,F401
from app.database import Base, engine  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402

assert engine.url.database == TEST_DB, "refusing to run tests against a non-test database"

with engine.begin() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)

from app.database import SessionLocal  # noqa: E402
from app.seed import seed  # noqa: E402

with SessionLocal() as _db:
    seed(_db)


# Reference data kept between tests: the KB (see the `kb` fixture) and seeded staff.
KEEP_TABLES = {"kb_documents", "kb_chunks", "departments", "technicians"}


@pytest.fixture(autouse=True)
def clean_tables():
    """Empty all ticket tables before each test."""
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables if t.name not in KEEP_TABLES)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def empty_kb():
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE kb_documents, kb_chunks RESTART IDENTITY CASCADE"))


@pytest.fixture
def kb():
    """Make sure the real /kb docs are ingested (mock embeddings, so no API calls).
    Unchanged docs are skipped, so this is cheap after the first run."""
    from app.database import SessionLocal
    from app.ingest import ingest

    with SessionLocal() as db:
        ingest(db, log=lambda *_: None)


@pytest.fixture
def client():
    with TestClient(fastapi_app) as c:
        yield c


VALID_TICKET = {
    "title": "Cannot connect to VPN from home",
    "description": "The VPN client times out every time I try to connect from my home Wi-Fi.",
    "category": "Network",
    "priority": "High",
    "user_name": "Asha Rao",
    "user_email": "asha.rao@example.com",
}


@pytest.fixture
def ticket_payload():
    return dict(VALID_TICKET)
