"""Regression: the AI suggestion must not run inside the request that created the ticket.

Starlette BackgroundTasks run after the response but within the same request cycle, so a slow
LLM call (up to the provider timeout) kept the connection busy. Render's proxy reuses
connections, so other users' requests queued behind it and were dropped ("Could not reach the
server" in the browser)."""

import threading

from app import rag
from app.routers import tickets as tickets_router


def test_ticket_creation_returns_while_suggestion_is_still_running(employee, ticket_payload, monkeypatch):
    started, release = threading.Event(), threading.Event()
    real = rag.suggest_for_ticket

    def slow_suggest(db, ticket):
        started.set()
        assert release.wait(10), "test timed out"
        return real(db, ticket)

    monkeypatch.setattr(tickets_router, "suggest_for_ticket", slow_suggest)
    # Use the real scheduler (conftest replaces it with a synchronous call for other tests).
    monkeypatch.setattr(tickets_router, "schedule_suggestion", tickets_router.submit_suggestion)

    r = employee.post("/tickets", json=ticket_payload)
    assert r.status_code == 201
    assert started.wait(5), "suggestion was not started"
    # The request has already completed while the suggestion is still blocked.
    assert employee.get(f"/tickets/{r.json()['id']}").json()["status"] == "OPEN"

    release.set()
    tickets_router.wait_for_suggestions()
    assert employee.get(f"/tickets/{r.json()['id']}").json()["status"] == "SUGGESTION_PROVIDED"
