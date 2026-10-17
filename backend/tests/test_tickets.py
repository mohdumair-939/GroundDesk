"""Test scenarios 1-3: ticket creation, validation, and status lifecycle/history."""

import pytest

ARJUN = "arjun.mehta@helpdesk.local"  # first Network Support technician


# Scenario 1: a valid ticket is created with a code, OPEN status, the requester and a history entry.
def test_create_ticket(employee, ticket_payload):
    r = employee.post("/tickets", json=ticket_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["ticket_code"] == "HD-0001"
    assert body["status"] == "OPEN"
    assert body["category"] == "Network"
    # The requester comes from the signed-in account, not the request body.
    assert (body["user_name"], body["user_email"]) == ("Asha Rao", "asha.rao@helpdesk.local")
    assert [h["new_status"] for h in body["history"]] == ["OPEN"]
    assert body["history"][0]["changed_by"]["name"] == "Asha Rao"

    r2 = employee.post("/tickets", json=ticket_payload)
    assert r2.json()["ticket_code"] == "HD-0002"

    got = employee.get(f"/tickets/{body['id']}")
    assert got.status_code == 200
    assert got.json()["title"] == ticket_payload["title"]


def test_priority_defaults_to_medium(employee, ticket_payload):
    ticket_payload.pop("priority")
    assert employee.post("/tickets", json=ticket_payload).json()["priority"] == "Medium"


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
        ("user_email", "someone@example.com"),  # requester fields are not accepted
    ],
)
def test_invalid_ticket_rejected(employee, ticket_payload, field, value):
    ticket_payload[field] = value
    r = employee.post("/tickets", json=ticket_payload)
    assert r.status_code == 422
    assert field in str(r.json()["detail"])


def test_missing_field_rejected(employee, ticket_payload):
    del ticket_payload["description"]
    assert employee.post("/tickets", json=ticket_payload).status_code == 422


def test_unknown_ticket_returns_404(employee):
    assert employee.get("/tickets/999").status_code == 404


# Scenario 3: status changes follow the lifecycle, record who made them, and are logged in history.
# (Creating a ticket also runs the automatic suggestion, so it starts as SUGGESTION_PROVIDED.)
def test_status_lifecycle_and_history(employee, login, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    assert employee.get(f"/tickets/{tid}").json()["status"] == "SUGGESTION_PROVIDED"

    assert employee.post(f"/tickets/{tid}/feedback", json={"resolved": False}).json()["status"] == "ASSIGNED"
    tech = login(ARJUN)
    assert tech.patch(f"/tickets/{tid}/status", json={"status": "IN_PROGRESS"}).json()["status"] == "IN_PROGRESS"
    r = tech.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "Reinstalled the VPN client"})
    assert r.json()["status"] == "PENDING_APPROVAL"
    r = employee.post(f"/tickets/{tid}/closure", json={"approved": True, "comment": "Works now"})
    assert r.json()["status"] == "CLOSED"

    history = employee.get(f"/tickets/{tid}/history").json()
    assert [(h["old_status"], h["new_status"]) for h in history] == [
        (None, "OPEN"),
        ("OPEN", "SUGGESTION_PROVIDED"),
        ("SUGGESTION_PROVIDED", "ESCALATED"),
        ("ESCALATED", "ASSIGNED"),
        ("ASSIGNED", "IN_PROGRESS"),
        ("IN_PROGRESS", "PENDING_APPROVAL"),
        ("PENDING_APPROVAL", "CLOSED"),
    ]
    actors = [h["changed_by"]["name"] if h["changed_by"] else "system" for h in history]
    assert actors == ["Asha Rao", "system", "Asha Rao", "system", "Arjun Mehta", "Arjun Mehta", "Asha Rao"]
    assert "Reinstalled the VPN client" in history[5]["note"]
    assert "Works now" in history[6]["note"]


def test_invalid_transitions_rejected(employee, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    # Employees cannot use status updates at all; workflow statuses come from the workflow endpoints.
    assert employee.patch(f"/tickets/{tid}/status", json={"status": "CLOSED", "note": "x"}).status_code == 403
    assert employee.get(f"/tickets/{tid}").json()["status"] == "SUGGESTION_PROVIDED"
    assert employee.post(f"/tickets/{tid}/closure", json={"approved": True}).status_code == 409
    assert len(employee.get(f"/tickets/{tid}/history").json()) == 2


def test_list_filters(employee, ticket_payload):
    employee.post("/tickets", json=ticket_payload)
    employee.post("/tickets", json={**ticket_payload, "title": "Outlook keeps crashing", "category": "Email"})

    assert len(employee.get("/tickets").json()) == 2
    emails = employee.get("/tickets", params={"category": "Email"}).json()
    assert [t["title"] for t in emails] == ["Outlook keeps crashing"]
    assert employee.get("/tickets", params={"status": "CLOSED"}).json() == []
    assert len(employee.get("/tickets", params={"q": "vpn"}).json()) == 1
    assert employee.get("/tickets", params={"status": "BOGUS"}).status_code == 422


def test_notes_are_added_to_the_timeline(employee, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    r = employee.post(f"/tickets/{tid}/notes", json={"note": "It also fails on mobile data"})
    last = r.json()["history"][-1]
    assert last["old_status"] == last["new_status"] == "SUGGESTION_PROVIDED"
    assert (last["note"], last["changed_by"]["name"]) == ("It also fails on mobile data", "Asha Rao")
