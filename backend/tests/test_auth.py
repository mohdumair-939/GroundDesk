"""Logins per role, one role per email, access scoping, and admin oversight actions."""

import pytest

PASSWORD = "Demo@1234"


def login_status(client, email, role, password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password, "role": role})


@pytest.mark.parametrize(
    "email,role",
    [
        ("asha.rao@helpdesk.local", "employee"),
        ("vikram.singh@helpdesk.local", "technician"),
        ("admin@helpdesk.local", "admin"),
    ],
)
def test_each_role_signs_in_through_its_own_option(client, email, role):
    r = login_status(client, email, role)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == role
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["email"] == email


@pytest.mark.parametrize(
    "email,wrong_role,right_label",
    [
        ("asha.rao@helpdesk.local", "admin", "Employee"),
        ("asha.rao@helpdesk.local", "technician", "Employee"),
        ("vikram.singh@helpdesk.local", "employee", "Technician"),
        ("admin@helpdesk.local", "employee", "Admin"),
    ],
)
def test_signing_in_through_another_roles_option_is_refused(client, email, wrong_role, right_label):
    r = login_status(client, email, wrong_role)
    assert r.status_code == 403
    assert f"use the {right_label} login" in r.json()["detail"]


def test_wrong_password_and_unknown_email(client):
    assert login_status(client, "asha.rao@helpdesk.local", "employee", "nope-nope").status_code == 401
    assert login_status(client, "nobody@helpdesk.local", "employee").status_code == 401


def test_requests_without_a_valid_token_are_rejected(client):
    assert client.get("/tickets").status_code == 401
    assert client.get("/tickets", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_employee_registration_and_one_role_per_email(client):
    r = client.post("/auth/register", json={"name": "Neha Patel", "email": "Neha@Example.com", "password": "Secret123!"})
    assert r.status_code == 201
    assert r.json()["user"] == {**r.json()["user"], "role": "employee", "email": "neha@example.com"}
    assert login_status(client, "neha@example.com", "employee", "Secret123!").status_code == 200

    # The same email cannot get a second account, in any letter case or role.
    for email in ("neha@example.com", "NEHA@example.com", "vikram.singh@helpdesk.local", "admin@helpdesk.local"):
        r = client.post("/auth/register", json={"name": "Someone", "email": email, "password": "Secret123!"})
        assert r.status_code == 409, email
    assert client.post("/auth/register", json={"name": "Shorty", "email": "s@example.com", "password": "short"}).status_code == 422


def test_employees_only_see_their_own_tickets(employee, login, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    ravi = login("ravi.kumar@helpdesk.local")
    assert ravi.get("/tickets").json() == []
    assert ravi.get(f"/tickets/{tid}").status_code == 404
    assert ravi.post(f"/tickets/{tid}/notes", json={"note": "hello there"}).status_code == 404


def test_only_employees_raise_tickets_and_only_admins_manage(login, admin, ticket_payload):
    tech = login("vikram.singh@helpdesk.local")
    assert tech.post("/tickets", json=ticket_payload).status_code == 403
    assert admin.post("/tickets", json=ticket_payload).status_code == 403
    assert tech.get("/users").status_code == 403
    assert tech.get("/technicians").status_code == 403
    assert login("asha.rao@helpdesk.local").get("/departments").status_code == 403


def test_admin_sees_everything_and_can_follow_up(employee, admin, login, kb, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    assert [t["id"] for t in admin.get("/tickets").json()] == [tid]

    # Change priority and category (logged), add a note.
    r = admin.patch(f"/tickets/{tid}", json={"priority": "Low", "category": "Software"})
    assert (r.json()["priority"], r.json()["category"]) == ("Low", "Software")
    assert "priority High → Low" in r.json()["history"][-1]["note"]
    r = admin.post(f"/tickets/{tid}/notes", json={"note": "Following up with the network team"})
    assert r.json()["history"][-1]["changed_by"]["role"] == "admin"

    # Escalate, then reassign to a specific technician in another department.
    employee.post(f"/tickets/{tid}/feedback", json={"resolved": False})
    techs = {t["name"]: t["id"] for t in admin.get("/technicians").json()}
    r = admin.post(f"/tickets/{tid}/reassign", json={"technician_id": techs["Meera Joshi"], "note": "Looks like an MFA issue"})
    a = r.json()["assignment"]
    assert (a["technician"]["name"], a["department"]["name"]) == ("Meera Joshi", "Identity & Access")
    assert a["rule_matched"].startswith("Reassigned by Help Desk Admin")
    assert [t["id"] for t in login("meera.joshi@helpdesk.local").get("/tickets").json()] == [tid]
    assert login("arjun.mehta@helpdesk.local").get(f"/tickets/{tid}").status_code == 404

    # Force-close needs a reason; reopen sends it back to the same technician.
    assert admin.patch(f"/tickets/{tid}/status", json={"status": "CLOSED"}).status_code == 422
    assert admin.patch(f"/tickets/{tid}/status", json={"status": "CLOSED", "note": "Duplicate of HD-0009"}).json()["status"] == "CLOSED"
    r = admin.post(f"/tickets/{tid}/reopen", json={"note": "Not a duplicate after all"})
    assert r.json()["status"] == "ASSIGNED"
    assert r.json()["assignment"]["technician"]["name"] == "Meera Joshi"


def test_admin_reopens_ai_resolved_ticket_by_routing_it(employee, admin, kb, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    employee.post(f"/tickets/{tid}/feedback", json={"resolved": True})
    r = admin.post(f"/tickets/{tid}/reopen", json={"note": "Employee called: it broke again"})
    assert r.json()["status"] == "ASSIGNED"
    assert r.json()["assignment"]["department"]["name"] == "Network Support"


def test_admin_user_management(client, admin):
    client.post("/auth/register", json={"name": "Temp User", "email": "temp@example.com", "password": "Secret123!"})
    users = {u["email"]: u for u in admin.get("/users").json()}
    assert users["admin@helpdesk.local"]["role"] == "admin"
    assert len([u for u in users.values() if u["role"] == "technician"]) == 9
    uid = users["temp@example.com"]["id"]

    admin.patch(f"/users/{uid}", json={"active": False})
    assert login_status(client, "temp@example.com", "employee", "Secret123!").status_code == 403
    admin.patch(f"/users/{uid}", json={"active": True, "password": "NewPass456!"})
    assert login_status(client, "temp@example.com", "employee", "NewPass456!").status_code == 200

    me = users["admin@helpdesk.local"]["id"]
    assert admin.patch(f"/users/{me}", json={"active": False}).status_code == 409


def test_disabled_account_token_stops_working(client, admin, login):
    ravi = login("ravi.kumar@helpdesk.local")
    uid = next(u["id"] for u in admin.get("/users").json() if u["email"] == "ravi.kumar@helpdesk.local")
    admin.patch(f"/users/{uid}", json={"active": False})
    assert ravi.get("/tickets").status_code == 401
