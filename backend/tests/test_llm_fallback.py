"""Provider fallback: a failing provider (e.g. quota exhausted) is skipped for a cool-down."""

import pytest

from app import llm_client
from app.llm_client import LLMError


@pytest.fixture
def two_providers(monkeypatch):
    monkeypatch.setattr(llm_client.settings, "llm_provider", "gemini")
    monkeypatch.setattr(llm_client.settings, "gemini_api_key", "g")
    monkeypatch.setattr(llm_client.settings, "groq_api_key", "q")
    monkeypatch.setattr(llm_client, "_cooling_until", {})
    calls = []

    def gemini(system, prompt):
        calls.append("gemini")
        raise LLMError("HTTP 429: quota exceeded")

    def groq(system, prompt):
        calls.append("groq")
        return "1. Restart the client [1]"

    monkeypatch.setattr(llm_client, "_gemini_generate", gemini)
    monkeypatch.setattr(llm_client, "_groq_generate", groq)
    return calls


def test_failing_provider_is_skipped_during_cooldown(two_providers):
    assert llm_client.generate("s", "p") == ("1. Restart the client [1]", "groq")
    assert llm_client.generate("s", "p") == ("1. Restart the client [1]", "groq")
    assert two_providers == ["gemini", "groq", "groq"]  # gemini not retried while cooling


def test_cooled_provider_is_tried_again_after_cooldown(two_providers, monkeypatch):
    llm_client.generate("s", "p")
    llm_client._cooling_until["gemini"] = 0  # cool-down expired
    llm_client.generate("s", "p")
    assert two_providers == ["gemini", "groq", "gemini", "groq"]


def test_all_cooling_still_tries(two_providers, monkeypatch):
    llm_client._cooling_until.update({"gemini": 1e12, "groq": 1e12})
    assert llm_client.generate("s", "p")[1] == "groq"
