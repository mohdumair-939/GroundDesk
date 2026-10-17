"""Test scenarios 1-3: ticket creation, validation, and status lifecycle/history."""

import pytest


# Scenario 1: a valid ticket is created with a code, OPEN status and a history entry.
def test_create_ticket(client, ticket_payload):
    r = client.post("/tickets", json=ticket_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["ticket_code"] == "HD-0001"
    assert body["status"] == "OPEN"
    assert body["category"] == "Network"
    assert [h["new_status"] for h in body["history"]] == ["OPEN"]

    r2 = client.post("/tickets", json=ticket_payload)
    assert r2.json()["ticket_code"] == "HD-0002"

    got = client.get(f"/tickets/{body['id']}")
    assert got.status_code == 200
    assert got.json()["title"] == ticket_payload["title"]


def test_priority_defaults_to_medium(client, ticket_payload):
    ticket_payload.pop("priority")
    assert client.post("/tickets", json=ticket_payload).json()["priority"] == "Medium"


# Scenario 2: bad input is rejected with 422.
@pytest.mark.parametrize(
    "field,value",
    [
        ("title", "VPN"),  # under 5 chars
        ("title", "x" * 121),  # over 120 chars
        ("title", "     "),  # whitespace only
        ("description", "too short"),  # under 20 chars
        ("category", "Plumbing"),  # not in the enum
        ("priority", "Urgent"),
        ("user_email", "not-an-email"),
    ],
)
def test_invalid_ticket_rejected(client, ticket_payload, field, value):
    ticket_payload[field] = value
    r = client.post("/tickets", json=ticket_payload)
    assert r.status_code == 422
    assert field in str(r.json()["detail"])


def test_missing_field_rejected(client, ticket_payload):
    del ticket_payload["description"]
    assert client.post("/tickets", json=ticket_payload).status_code == 422


def test_unknown_ticket_returns_404(client):
    assert client.get("/tickets/999").status_code == 404


# Scenario 3: status changes follow the lifecycle and are logged in history.
# (Creating a ticket also runs the automatic suggestion, so it starts as SUGGESTION_PROVIDED.)
def test_status_lifecycle_and_history(client, ticket_payload):
    tid = client.post("/tickets", json=ticket_payload).json()["id"]
    assert client.get(f"/tickets/{tid}").json()["status"] == "SUGGESTION_PROVIDED"

    r = client.post(f"/tickets/{tid}/feedback", json={"resolved": False})
    assert r.json()["status"] == "ASSIGNED"
    for new in ["IN_PROGRESS", "CLOSED"]:
        r = client.patch(f"/tickets/{tid}/status", json={"status": new, "note": f"to {new}"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == new

    history = client.get(f"/tickets/{tid}/history").json()
    assert [(h["old_status"], h["new_status"]) for h in history] == [
        (None, "OPEN"),
        ("OPEN", "SUGGESTION_PROVIDED"),
        ("SUGGESTION_PROVIDED", "ESCALATED"),
        ("ESCALATED", "ASSIGNED"),
        ("ASSIGNED", "IN_PROGRESS"),
        ("IN_PROGRESS", "CLOSED"),
    ]
    assert history[-1]["note"] == "to CLOSED"


def test_invalid_transition_rejected(client, ticket_payload):
    tid = client.post("/tickets", json=ticket_payload).json()["id"]
    r = client.patch(f"/tickets/{tid}/status", json={"status": "CLOSED"})
    assert r.status_code == 409
    # Workflow statuses can only be reached through the suggestion/feedback endpoints.
    assert client.patch(f"/tickets/{tid}/status", json={"status": "RESOLVED"}).status_code == 409
    assert client.get(f"/tickets/{tid}").json()["status"] == "SUGGESTION_PROVIDED"
    assert len(client.get(f"/tickets/{tid}/history").json()) == 2


def test_list_filters(client, ticket_payload):
    client.post("/tickets", json=ticket_payload)
    client.post("/tickets", json={**ticket_payload, "title": "Outlook keeps crashing", "category": "Email"})

    assert len(client.get("/tickets").json()) == 2
    emails = client.get("/tickets", params={"category": "Email"}).json()
    assert [t["title"] for t in emails] == ["Outlook keeps crashing"]
    assert client.get("/tickets", params={"status": "CLOSED"}).json() == []
    assert len(client.get("/tickets", params={"q": "vpn"}).json()) == 1
    assert client.get("/tickets", params={"status": "BOGUS"}).status_code == 422
