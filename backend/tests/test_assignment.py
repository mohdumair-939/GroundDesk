"""Test scenarios 7-9: resolved feedback, escalation with rule-based routing, and the
technician workflow with least-loaded assignment."""

import pytest

from app.assignment import choose_department
from app.models import Category, Ticket


def make_ticket(client, **overrides):
    payload = {
        "title": "Cannot connect to VPN from home",
        "description": "The VPN client times out every time I try to connect from my home Wi-Fi.",
        "category": "Network",
        "user_name": "Asha Rao",
        "user_email": "asha.rao@example.com",
        **overrides,
    }
    r = client.post("/tickets", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


# Scenario 7: "Yes, this fixed it" resolves the ticket and records the feedback.
def test_yes_feedback_resolves(client, kb):
    tid = make_ticket(client)
    r = client.post(f"/tickets/{tid}/feedback", json={"resolved": True, "comment": "Restarting the client worked"})
    assert r.status_code == 200
    t = r.json()
    assert t["status"] == "RESOLVED"
    assert t["assignment"] is None
    assert t["suggestion"]["feedback_resolved"] is True
    assert t["suggestion"]["feedback_comment"] == "Restarting the client worked"
    assert "Restarting the client worked" in t["history"][-1]["note"]

    # Feedback cannot be given twice.
    assert client.post(f"/tickets/{tid}/feedback", json={"resolved": False}).status_code == 409


# Scenario 8: "No" escalates and routes by category to the right department, with the rule shown.
def test_no_feedback_escalates_and_assigns_by_category(client, kb):
    tid = make_ticket(
        client,
        title="Laptop fan making grinding noise",
        description="The fan in my laptop makes a loud grinding noise and the bottom gets hot.",
        category="Hardware",
    )
    assert client.get(f"/tickets/{tid}").json()["suggestion"]["answered"] is False

    t = client.post(f"/tickets/{tid}/feedback", json={"resolved": False}).json()
    assert t["status"] == "ASSIGNED"
    assert [h["new_status"] for h in t["history"]] == ["OPEN", "SUGGESTION_PROVIDED", "ESCALATED", "ASSIGNED"]
    a = t["assignment"]
    assert a["department"]["name"] == "Hardware Support"
    assert a["technician"]["name"] == "Vikram Singh"
    assert a["rule_matched"].startswith("Category rule: Hardware → Hardware Support")
    assert t["suggestion"]["feedback_resolved"] is False


@pytest.mark.parametrize(
    "title,description,expected,rule_start",
    [
        ("VPN drops every hour", "Something is wrong with my connection at home.", "Network Support", "Keyword rule: 'vpn'"),
        ("Forgot my password", "I cannot sign in to the portal after the holidays.", "Identity & Access", "Keyword rule: 'password'"),
        ("Printer jammed again", "The printer on floor 2 has a paper jam.", "Hardware Support", "Keyword rule: 'printer'"),
        ("Need a new desk chair", "My chair is broken and the height lever does not work.", "General IT", "Default rule"),
    ],
)
def test_keyword_fallback_and_default(title, description, expected, rule_start):
    route = choose_department(Ticket(title=title, description=description, category=Category.OTHER))
    assert route.department == expected
    assert route.rule.startswith(rule_start)


def test_category_rules_cover_every_category_except_other():
    for category in Category:
        route = choose_department(Ticket(title="x", description="y", category=category))
        if category is Category.OTHER:
            assert route.department == "General IT"
        else:
            assert route.rule.startswith("Category rule")


def test_no_feedback_works_when_ai_unavailable(client, kb, monkeypatch):
    from app import rag
    from app.llm_client import LLMError

    def boom(*_):
        raise LLMError("down")

    monkeypatch.setattr(rag, "generate", boom)
    tid = make_ticket(client)
    assert client.get(f"/tickets/{tid}").json()["status"] == "OPEN"
    assert client.post(f"/tickets/{tid}/feedback", json={"resolved": True}).status_code == 409
    t = client.post(f"/tickets/{tid}/feedback", json={"resolved": False}).json()
    assert t["status"] == "ASSIGNED"
    assert t["assignment"]["department"]["name"] == "Network Support"


# Scenario 9: least-loaded technician, then the technician moves the ticket to CLOSED.
def test_least_loaded_technician_and_technician_flow(client, kb):
    ids = [make_ticket(client, title=f"Wi-Fi drops in room {n}", category="Network") for n in range(3)]
    techs = [client.post(f"/tickets/{i}/feedback", json={"resolved": False}).json()["assignment"]["technician"]["name"] for i in ids]
    # Two Network technicians: the load alternates, ties go to the lower id.
    assert techs == ["Arjun Mehta", "Priya Nair", "Arjun Mehta"]

    staff = {t["name"]: t for t in client.get("/technicians").json()}
    assert staff["Arjun Mehta"]["open_tickets"] == 2
    assert staff["Priya Nair"]["open_tickets"] == 1

    arjun = staff["Arjun Mehta"]["id"]
    mine = client.get("/tickets", params={"technician_id": arjun}).json()
    assert sorted(t["id"] for t in mine) == [ids[0], ids[2]]
    assert all(t["assignment"]["technician"]["id"] == arjun for t in mine)

    tid = ids[0]
    assert client.patch(f"/tickets/{tid}/status", json={"status": "CLOSED"}).status_code == 409  # must start first
    assert client.patch(f"/tickets/{tid}/status", json={"status": "IN_PROGRESS"}).json()["status"] == "IN_PROGRESS"
    assert client.patch(f"/tickets/{tid}/status", json={"status": "CLOSED"}).json()["status"] == "CLOSED"

    # A closed ticket no longer counts toward the technician's load.
    staff = {t["name"]: t for t in client.get("/technicians").json()}
    assert staff["Arjun Mehta"]["open_tickets"] == 1
    next_tech = client.post(
        f"/tickets/{make_ticket(client, category='Network')}/feedback", json={"resolved": False}
    ).json()["assignment"]["technician"]["name"]
    assert next_tech == "Arjun Mehta"  # 1 open each now; tie goes to the lower id


def test_departments_endpoint(client):
    depts = client.get("/departments").json()
    assert [d["name"] for d in depts] == [
        "Network Support",
        "Application Support",
        "Hardware Support",
        "Identity & Access",
        "General IT",
    ]
    assert sum(len(d["technicians"]) for d in depts) == 9
