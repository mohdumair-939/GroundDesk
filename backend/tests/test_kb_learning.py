"""Learning loop: a technician's fix for an escalated ticket becomes a KB article (after the
employee confirms it and an admin publishes it), and later similar tickets are answered from it."""

from app import kb_learning
from app.llm_client import LLMError

FAN_TICKET = {
    "title": "Laptop fan making grinding noise",
    "description": "The fan in my laptop makes a loud grinding noise and the bottom gets hot.",
    "category": "Hardware",
}
SIMILAR_FAN_TICKET = {
    "title": "Grinding noise from laptop fan",
    "description": "My laptop fan is grinding loudly and the laptop bottom becomes very hot.",
    "category": "Hardware",
}
ARTICLE = {
    "title": "Laptop fan grinding noise and laptop getting hot",
    "problem": "The laptop fan makes a loud grinding noise and the bottom of the laptop gets hot.",
    "cause": "Dust build-up in the fan and vents, and a stuck fan bearing.",
    "steps": (
        "1. Shut down the laptop and unplug the charger before touching the vents.\n"
        "2. Blow compressed air into the side and bottom vents in short bursts.\n"
        "3. Update the BIOS and the fan control driver from the Software Center.\n"
        "4. If the grinding continues, book a fan replacement with Hardware Support."
    ),
}


def escalated_fan_ticket(employee, login, payload=FAN_TICKET):
    """Raise a ticket the KB cannot answer, escalate it, and return (ticket id, technician client)."""
    ticket = employee.post("/tickets", json=payload).json()
    assert employee.get(f"/tickets/{ticket['id']}").json()["suggestion"]["answered"] is False
    ticket = employee.post(f"/tickets/{ticket['id']}/feedback", json={"resolved": False}).json()
    tech = login(ticket["assignment"]["technician"]["email"])
    assert tech.patch(f"/tickets/{ticket['id']}/status", json={"status": "IN_PROGRESS"}).status_code == 200
    return ticket["id"], tech


def mark_solved(tech, tid, article=ARTICLE):
    body = {"status": "PENDING_APPROVAL", "note": "Cleaned the fan and vents", "kb_article": article}
    r = tech.patch(f"/tickets/{tid}/status", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_resolved_ticket_teaches_the_kb(employee, login, admin, kb):
    tid, tech = escalated_fan_ticket(employee, login)

    ticket = mark_solved(tech, tid)
    assert ticket["kb_article"]["status"] == "AWAITING_CLOSURE"
    # The employee still sees the resolution note as the last PENDING_APPROVAL entry.
    pending = [h for h in ticket["history"] if h["new_status"] == "PENDING_APPROVAL"]
    assert pending[-1]["note"].endswith("Resolution: Cleaned the fan and vents")
    # Not reviewable before the employee confirms the fix.
    article_id = ticket["kb_article"]["id"]
    assert admin.post(f"/kb/articles/{article_id}/publish", json={}).status_code == 409

    ticket = employee.post(f"/tickets/{tid}/closure", json={"approved": True}).json()
    assert ticket["status"] == "CLOSED"
    assert ticket["kb_article"]["status"] == "PENDING_REVIEW"

    queue = admin.get("/kb/articles", params={"status": "PENDING_REVIEW"}).json()
    assert [a["id"] for a in queue] == [article_id]
    assert queue[0]["confirmed_by_employee"] is True
    assert queue[0]["ticket"]["ticket_code"] == "HD-0001"
    assert queue[0]["category"] == "Hardware"

    r = admin.post(f"/kb/articles/{article_id}/publish", json={"note": "Good general fix"})
    assert r.status_code == 200, r.text
    published = r.json()
    assert published["status"] == "PUBLISHED"
    assert published["document_id"] is not None
    assert published["reviewed_by"]["name"]
    assert admin.get("/kb/summary").json()["documents"]["ticket"] == 1

    # A later, similar ticket is now answered from the learned article, which is cited.
    other = login("ravi.kumar@helpdesk.local")
    new_id = other.post("/tickets", json=SIMILAR_FAN_TICKET).json()["id"]
    suggestion = other.get(f"/tickets/{new_id}").json()["suggestion"]
    assert suggestion["answered"] is True
    assert suggestion["sources"][0]["origin"] == "ticket"
    assert suggestion["sources"][0]["source"] == f"ticket-hd-0001-{article_id}"
    assert "compressed air" in suggestion["suggestion_text"]


def test_fix_the_employee_rejects_never_reaches_the_kb(employee, login, admin, kb):
    tid, tech = escalated_fan_ticket(employee, login)
    article_id = mark_solved(tech, tid)["kb_article"]["id"]

    r = employee.post(f"/tickets/{tid}/closure", json={"approved": False, "comment": "Still grinding"})
    assert r.json()["status"] == "IN_PROGRESS"
    assert r.json()["kb_article"]["status"] == "REJECTED"
    assert admin.post(f"/kb/articles/{article_id}/publish", json={}).status_code == 409

    # The technician tries again with a new fix; only that one goes to review.
    fixed = dict(ARTICLE, steps=ARTICLE["steps"] + "\n5. Replace the fan.")
    new_id = mark_solved(tech, tid, fixed)["kb_article"]["id"]
    assert new_id != article_id
    employee.post(f"/tickets/{tid}/closure", json={"approved": True})
    queue = admin.get("/kb/articles", params={"status": "PENDING_REVIEW"}).json()
    assert [a["id"] for a in queue] == [new_id]


def test_admin_force_close_sends_article_to_review_unconfirmed(employee, login, admin, kb):
    tid, tech = escalated_fan_ticket(employee, login)
    article_id = mark_solved(tech, tid)["kb_article"]["id"]
    admin.patch(f"/tickets/{tid}/status", json={"status": "CLOSED", "note": "Employee unreachable"})
    article = admin.get(f"/kb/articles/{article_id}").json()
    assert article["status"] == "PENDING_REVIEW"
    assert article["confirmed_by_employee"] is False


def test_admin_edits_rejects_and_unpublishes(employee, login, admin, kb):
    tid, tech = escalated_fan_ticket(employee, login)
    article_id = mark_solved(tech, tid)["kb_article"]["id"]
    employee.post(f"/tickets/{tid}/closure", json={"approved": True})

    r = admin.patch(f"/kb/articles/{article_id}", json={"title": "Noisy, hot laptop fan", "cause": ""})
    assert r.json()["title"] == "Noisy, hot laptop fan"
    assert r.json()["cause"] is None
    assert admin.patch(f"/kb/articles/{article_id}", json={"steps": "too short"}).status_code == 422

    admin.post(f"/kb/articles/{article_id}/publish", json={})
    r = admin.post(f"/kb/articles/{article_id}/unpublish", json={"note": "Needs a safety warning"})
    assert r.json()["status"] == "PENDING_REVIEW"
    assert r.json()["document_id"] is None
    assert admin.get("/kb/summary").json()["documents"]["ticket"] == 0

    # Without the learned article, the similar ticket falls back to the guard again.
    other = login("ravi.kumar@helpdesk.local")
    new_id = other.post("/tickets", json=SIMILAR_FAN_TICKET).json()["id"]
    assert other.get(f"/tickets/{new_id}").json()["suggestion"]["answered"] is False

    r = admin.post(f"/kb/articles/{article_id}/reject", json={"note": "Duplicate of the hardware guide"})
    assert r.json()["status"] == "REJECTED"
    assert admin.post(f"/kb/articles/{article_id}/reject", json={"note": "again"}).status_code == 409


def test_kb_article_validation_and_access(employee, login, admin, kb):
    tid, tech = escalated_fan_ticket(employee, login)
    # Only with "mark solved".
    r = tech.patch(f"/tickets/{tid}/status", json={"status": "IN_PROGRESS", "kb_article": ARTICLE})
    assert r.status_code in (409, 422)
    bad = dict(ARTICLE, steps="Fixed it")
    r = tech.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "Done", "kb_article": bad})
    assert r.status_code == 422
    # Marking solved without proposing an article still works and creates none.
    r = tech.patch(f"/tickets/{tid}/status", json={"status": "PENDING_APPROVAL", "note": "Cleaned the fan"})
    assert r.json()["kb_article"] is None

    for client in (employee, tech):
        assert client.get("/kb/articles").status_code == 403
        assert client.get("/kb/summary").status_code == 403
    assert admin.get("/kb/articles/999").status_code == 404


def test_publish_failure_changes_nothing(employee, login, admin, kb, monkeypatch):
    tid, tech = escalated_fan_ticket(employee, login)
    article_id = mark_solved(tech, tid)["kb_article"]["id"]
    employee.post(f"/tickets/{tid}/closure", json={"approved": True})

    def embedding_down(texts):
        raise LLMError("quota exceeded")

    monkeypatch.setattr(kb_learning, "embed_documents", embedding_down)
    assert admin.post(f"/kb/articles/{article_id}/publish", json={}).status_code == 503
    article = admin.get(f"/kb/articles/{article_id}").json()
    assert article["status"] == "PENDING_REVIEW"
    assert article["document_id"] is None


def test_ingest_keeps_learned_articles(employee, login, admin, kb):
    from app.database import SessionLocal
    from app.ingest import ingest

    tid, tech = escalated_fan_ticket(employee, login)
    article_id = mark_solved(tech, tid)["kb_article"]["id"]
    employee.post(f"/tickets/{tid}/closure", json={"approved": True})
    admin.post(f"/kb/articles/{article_id}/publish", json={})

    with SessionLocal() as db:
        stats = ingest(db, log=lambda *_: None)
    assert stats["removed"] == 0
    assert stats["ticket_articles_reembedded"] == 0
    assert admin.get("/kb/summary").json()["documents"]["ticket"] == 1

    with SessionLocal() as db:  # --force re-embeds learned articles too
        stats = ingest(db, force=True, log=lambda *_: None)
    assert stats["ticket_articles_reembedded"] == 1
    article = admin.get(f"/kb/articles/{article_id}").json()
    assert article["status"] == "PUBLISHED" and article["document_id"] is not None
