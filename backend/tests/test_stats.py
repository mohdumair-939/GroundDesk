"""Admin dashboard numbers (Sprint 4.2)."""


def make(client, **overrides):
    payload = {"title": "Cannot connect to VPN from home", "description": "The VPN client times out every time I connect.", "category": "Network", **overrides}
    return client.post("/tickets", json=payload).json()["id"]


def test_stats_counts_statuses_ai_outcomes_and_departments(employee, login, admin, kb):
    resolved = make(employee)
    employee.post(f"/tickets/{resolved}/feedback", json={"resolved": True})

    fan = make(employee, title="Laptop fan making grinding noise", description="The fan in my laptop makes a loud grinding noise.", category="Hardware")
    employee.post(f"/tickets/{fan}/feedback", json={"resolved": False})
    tech = login("vikram.singh@grounddesk.com")
    tech.patch(f"/tickets/{fan}/status", json={"status": "IN_PROGRESS"})
    tech.patch(f"/tickets/{fan}/status", json={"status": "PENDING_APPROVAL", "note": "Replaced the fan"})
    employee.post(f"/tickets/{fan}/closure", json={"approved": True})

    waiting = make(employee)  # suggestion shown, no answer yet

    s = admin.get("/stats").json()
    assert s["total"] == 3
    assert (s["by_status"]["RESOLVED"], s["by_status"]["CLOSED"], s["by_status"]["SUGGESTION_PROVIDED"]) == (1, 1, 1)
    assert s["by_category"] == {"Network": 2, "Hardware": 1}
    assert s["ai"] == {
        "with_suggestion": 3,
        "answered": 2,
        "no_reliable_answer": 1,
        "resolved_by_ai": 1,
        "escalated": 1,
        "awaiting_answer": 1,
    }
    assert isinstance(s["avg_minutes_to_close"], int) and s["avg_minutes_to_close"] >= 0
    hardware = next(d for d in s["departments"] if d["name"] == "Hardware Support")
    assert hardware == {"name": "Hardware Support", "open": 0, "awaiting_approval": 0, "closed": 1, "total": 1}
    assert len(s["departments"]) == 5
    assert waiting  # created


def test_stats_are_admin_only(employee, login):
    assert employee.get("/stats").status_code == 403
    assert login("vikram.singh@grounddesk.com").get("/stats").status_code == 403
