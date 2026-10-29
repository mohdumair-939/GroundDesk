"""Test scenarios 7-9: resolved feedback, escalation with rule-based routing, and the
technician workflow with least-loaded assignment and employee-approved closure."""

import pytest

from app.assignment import choose_department
from app.models import Category, Ticket

VIKRAM = "vikram.singh@grounddesk.com"
ARJUN = "arjun.mehta@grounddesk.com"
PRIYA = "priya.nair@grounddesk.com"


def make_ticket(client, **overrides):
    payload = {
        "title": "Cannot connect to VPN from home",
        "description": "The VPN client times out every time I try to connect from my home Wi-Fi.",
        "category": "Network",
        **overrides,
    }
    r = client.post("/tickets", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def escalate(client, tid):
    r = client.post(f"/tickets/{tid}/feedback", json={"resolved": False})
    assert r.status_code == 200, r.text
    return r.json()


# Scenario 7: "Yes, this fixed it" resolves the ticket and records the feedback.
def test_yes_feedback_resolves(employee, kb):
    tid = make_ticket(employee)
    r = employee.post(f"/tickets/{tid}/feedback", json={"resolved": True, "comment": "Restarting the client worked"})
    assert r.status_code == 200
    t = r.json()
    assert t["status"] == "RESOLVED"
    assert t["assignment"] is None
    assert t["suggestion"]["feedback_resolved"] is True
    assert t["suggestion"]["feedback_comment"] == "Restarting the client worked"
    assert "Restarting the client worked" in t["history"][-1]["note"]

    # Feedback cannot be given twice.
    assert employee.post(f"/tickets/{tid}/feedback", json={"resolved": False}).status_code == 409


# Scenario 8: "No" escalates and routes by category to the right department, with the rule shown.
def test_no_feedback_escalates_and_assigns_by_category(employee, kb):
    tid = make_ticket(
        employee,
        title="Laptop fan making grinding noise",
        description="The fan in my laptop makes a loud grinding noise and the bottom gets hot.",
        category="Hardware",
    )
    assert employee.get(f"/tickets/{tid}").json()["suggestion"]["answered"] is False

    t = escalate(employee, tid)
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


def test_no_feedback_works_when_ai_unavailable(employee, kb, monkeypatch):
    from app import rag
    from app.llm_client import LLMError

    def boom(*_):
        raise LLMError("down")

    monkeypatch.setattr(rag, "generate", boom)
    tid = make_ticket(employee)
    assert employee.get(f"/tickets/{tid}").json()["status"] == "OPEN"
    assert employee.post(f"/tickets/{tid}/feedback", json={"resolved": True}).status_code == 409
    t = escalate(employee, tid)
    assert t["status"] == "ASSIGNED"
    assert t["assignment"]["department"]["name"] == "Network Support"


# Scenario 9: least-loaded technician; technician solves; employee approves or rejects closure.
def test_least_loaded_technician(employee, admin, kb):
    ids = [make_ticket(employee, title=f"Wi-Fi drops in room {n}") for n in range(3)]
    techs = [escalate(employee, i)["assignment"]["technician"]["name"] for i in ids]
    # Two Network technicians: the load alternates, ties go to the lower id.
    assert techs == ["Arjun Mehta", "Priya Nair", "Arjun Mehta"]

    staff = {t["name"]: t for t in admin.get("/technicians").json()}
    assert staff["Arjun Mehta"]["open_tickets"] == 2
    assert staff["Priya Nair"]["open_tickets"] == 1


def test_technician_flow_with_closure_approval(employee, login, kb):
    tid = make_ticket(employee)
    escalate(employee, tid)
    arjun = login(ARJUN)

    # The technician's queue only shows tickets assigned to them.
    assert [t["id"] for t in arjun.get("/tickets").json()] == [tid]
    assert login(PRIYA).get("/tickets").json() == []
    assert login(PRIYA).get(f"/tickets/{tid}").status_code == 404

    # Must start before solving, and a technician can never close a ticket.
    assert arjun.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "x fixed"}).status_code == 409
    assert arjun.patch(f"/tickets/{tid}/status", json={"status": "IN_PROGRESS"}).status_code == 200
    assert arjun.patch(f"/tickets/{tid}/status", json={"status": "CLOSED", "note": "done"}).status_code == 409
    assert arjun.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL"}).status_code == 422  # note needed
    r = arjun.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "Updated the VPN client"})
    assert r.json()["status"] == "PENDING_APPROVAL"

    # Employee rejects (reason required) -> back to the same technician.
    assert employee.post(f"/tickets/{tid}/closure", json={"approved": False}).status_code == 422
    r = employee.post(f"/tickets/{tid}/closure", json={"approved": False, "comment": "Still drops after an hour"})
    assert r.json()["status"] == "IN_PROGRESS"
    assert r.json()["assignment"]["technician"]["name"] == "Arjun Mehta"

    arjun.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "Replaced the Wi-Fi driver"})
    # Only the employee who raised it can approve.
    assert login("ravi.kumar@helpdesk.local").post(f"/tickets/{tid}/closure", json={"approved": True}).status_code == 404
    assert arjun.post(f"/tickets/{tid}/closure", json={"approved": True}).status_code == 403
    r = employee.post(f"/tickets/{tid}/closure", json={"approved": True})
    assert r.json()["status"] == "CLOSED"


def test_closed_ticket_frees_technician_load(employee, login, admin, kb):
    tid = make_ticket(employee)
    escalate(employee, tid)
    arjun = login(ARJUN)
    arjun.patch(f"/tickets/{tid}/status", json={"status": "IN_PROGRESS"})
    arjun.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "Fixed the profile"})
    employee.post(f"/tickets/{tid}/closure", json={"approved": True})

    staff = {t["name"]: t for t in admin.get("/technicians").json()}
    assert staff["Arjun Mehta"]["open_tickets"] == 0
    assert escalate(employee, make_ticket(employee))["assignment"]["technician"]["name"] == "Arjun Mehta"


def test_departments_endpoint(admin):
    depts = admin.get("/departments").json()
    assert [d["name"] for d in depts] == [
        "Network Support",
        "Application Support",
        "Hardware Support",
        "Identity & Access",
        "General IT",
    ]
    assert sum(len(d["technicians"]) for d in depts) == 9
