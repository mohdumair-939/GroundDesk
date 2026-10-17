"""Test scenarios 4-6: retrieval of known issues, the insufficient-context guard, and saved
grounded suggestions. Uses mock embeddings and a mocked LLM, so no API calls are made."""

import pytest

from app import llm_client, rag
from app.ingest import chunk_text, parse_doc
from app.llm_client import LLMError

FAN_TICKET = {
    "title": "Laptop fan making grinding noise",
    "description": "The fan in my laptop makes a loud grinding noise and the bottom gets hot.",
    "category": "Hardware",
}


# Scenario 4: a known issue retrieves the right KB article and gets grounded steps.
def test_known_issue_gets_grounded_suggestion(employee, kb, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    ticket = employee.get(f"/tickets/{tid}").json()

    assert ticket["status"] == "SUGGESTION_PROVIDED"
    s = ticket["suggestion"]
    assert s["answered"] is True
    assert s["sources"][0]["source"] == "network-vpn-connection.md"
    assert s["sources"][0]["score"] == s["top_score"]
    assert s["confidence"] in {"High", "Medium", "Low"}
    assert s["suggestion_text"].startswith("1. ")
    assert "[1]" in s["suggestion_text"]  # steps cite their source
    assert "AI suggestion generated" in ticket["history"][-1]["note"]


def test_retrieval_ranks_matching_article_first(employee, kb):
    from app.database import SessionLocal

    with SessionLocal() as db:
        hits = rag.retrieve(db, "Printer says offline and documents never print")
    assert hits[0].document.source == "hardware-printer.md"
    assert len(hits) == 4
    assert hits[0].score >= hits[1].score


# Scenario 5: an issue the KB does not cover gets "no reliable solution" and no LLM call.
def test_irrelevant_issue_gets_no_answer_without_llm(employee, kb, monkeypatch):
    def llm_must_not_be_called(*args, **kwargs):
        raise AssertionError("LLM was called despite low retrieval scores")

    monkeypatch.setattr(rag, "generate", llm_must_not_be_called)
    tid = employee.post("/tickets", json=FAN_TICKET).json()["id"]
    ticket = employee.get(f"/tickets/{tid}").json()

    assert ticket["status"] == "SUGGESTION_PROVIDED"
    s = ticket["suggestion"]
    assert s["answered"] is False
    assert s["confidence"] is None
    assert s["provider"] == "guard"
    assert s["suggestion_text"] == rag.NO_SOLUTION_TEXT
    assert s["top_score"] < 0.40
    assert "No reliable KB match" in ticket["history"][-1]["note"]


def test_llm_saying_no_answer_is_not_shown_as_solution(employee, kb, ticket_payload, monkeypatch):
    monkeypatch.setattr(rag, "generate", lambda system, prompt: ("NO_ANSWER", "mock"))
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    s = employee.get(f"/tickets/{tid}").json()["suggestion"]
    assert s["answered"] is False
    assert s["suggestion_text"] == rag.NO_SOLUTION_TEXT


def test_empty_kb_gives_no_answer(employee, empty_kb, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    s = employee.get(f"/tickets/{tid}").json()["suggestion"]
    assert s["answered"] is False
    assert s["sources"] == []


# Scenario 6: the suggestion endpoint saves text + sources, and handles failures safely.
def test_prompt_is_grounded_in_retrieved_context(employee, kb, ticket_payload, monkeypatch):
    seen = {}

    def fake_generate(system, prompt):
        seen["system"], seen["prompt"] = system, prompt
        return "1. Restart the VPN employee [1]\n2. Reboot the router [1]", "mock"

    monkeypatch.setattr(rag, "generate", fake_generate)
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    s = employee.get(f"/tickets/{tid}").json()["suggestion"]

    assert "ONLY the numbered knowledge base excerpts" in seen["system"]
    assert "[1] VPN will not connect or keeps disconnecting" in seen["prompt"]
    assert ticket_payload["description"] in seen["prompt"]
    assert s["suggestion_text"] == "1. Restart the VPN employee [1]\n2. Reboot the router [1]"
    assert s["provider"] == "mock"


def test_llm_failure_returns_503_and_ticket_stays_open(employee, kb, ticket_payload, monkeypatch):
    def boom(system, prompt):
        raise LLMError("provider down")

    monkeypatch.setattr(rag, "generate", boom)
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]  # auto-run fails quietly
    assert employee.get(f"/tickets/{tid}").json()["status"] == "OPEN"

    r = employee.post(f"/tickets/{tid}/suggest")
    assert r.status_code == 503
    assert employee.get(f"/tickets/{tid}").json()["suggestion"] is None

    monkeypatch.undo()  # provider recovers: a manual retry works
    r = employee.post(f"/tickets/{tid}/suggest")
    assert r.status_code == 200
    assert r.json()["status"] == "SUGGESTION_PROVIDED"
    assert r.json()["suggestion"]["answered"] is True


def test_suggest_rejected_when_not_open(employee, kb, ticket_payload):
    tid = employee.post("/tickets", json=ticket_payload).json()["id"]
    r = employee.post(f"/tickets/{tid}/suggest")
    assert r.status_code == 409
    assert len(employee.get(f"/tickets/{tid}").json()["history"]) == 2


# Ingestion helpers
def test_chunking_respects_size_and_overlap():
    body = "\n\n".join(f"Paragraph {i} " + "word " * 60 for i in range(20))
    chunks = chunk_text(body, max_tokens=200, overlap_tokens=50)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.split()) <= 150 + 37  # 200 tokens * 0.75 words/token, plus the overlap
    # Each chunk starts with the last ~50 tokens (37 words) of the previous one.
    for prev, nxt in zip(chunks, chunks[1:]):
        assert nxt.split()[:37] == prev.split()[-37:]

    # Paragraphs that fit in the overlap are carried whole.
    short = "\n\n".join(f"Para {i} " + "w " * 20 for i in range(12))
    parts = chunk_text(short, max_tokens=200, overlap_tokens=50)
    assert parts[0].split("\n\n")[-1] == parts[1].split("\n\n")[0]


def test_parse_doc_requires_front_matter(tmp_path):
    good = tmp_path / "good.md"
    good.write_text("---\ntitle: Test doc\ncategory: Email\n---\n\nBody text", encoding="utf-8")
    doc = parse_doc(good)
    assert (doc.title, doc.category.value, doc.body) == ("Test doc", "Email", "Body text")

    bad = tmp_path / "bad.md"
    bad.write_text("# No front matter", encoding="utf-8")
    with pytest.raises(ValueError):
        parse_doc(bad)


def test_mock_llm_cites_first_source():
    text = llm_client._mock_generate("[1] Doc (Network)\nRestart the VPN employee and try again.\n\n[2] Other\nx")
    assert text == "1. Restart the VPN employee and try again. [1]"
