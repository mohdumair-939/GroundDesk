"""One place for every call to an external AI provider: embeddings and text generation.

Providers can be swapped with LLM_PROVIDER / EMBEDDING_PROVIDER. The "mock" providers need
no network and are used by the tests and as a demo fallback.
"""

import hashlib
import logging
import math
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Short enough that a stalled provider falls back to the other one quickly.
TIMEOUT = httpx.Timeout(25.0, connect=10.0)


class LLMError(RuntimeError):
    pass


# ---------------------------------------------------------------- embeddings


def embedding_model_name() -> str:
    """Stored with each KB document so retrieval never mixes vectors from different models."""
    if settings.embedding_provider == "mock":
        return f"mock-hash-{EMBEDDING_DIM}"
    return f"{settings.gemini_embedding_model}-{EMBEDDING_DIM}"


def embed_documents(texts: list[str]) -> list[list[float]]:
    return _embed(texts, "RETRIEVAL_DOCUMENT")


def embed_query(text: str) -> list[float]:
    return _embed([text], "RETRIEVAL_QUERY")[0]


def _embed(texts: list[str], task_type: str) -> list[list[float]]:
    if settings.embedding_provider == "mock":
        return [_mock_embedding(t) for t in texts]
    if settings.embedding_provider != "gemini":
        raise LLMError(f"Unknown EMBEDDING_PROVIDER {settings.embedding_provider!r}")
    if not settings.gemini_api_key:
        raise LLMError("GEMINI_API_KEY is not set")

    model = settings.gemini_embedding_model
    vectors: list[list[float]] = []
    for start in range(0, len(texts), 100):  # API limit: 100 texts per batch
        batch = texts[start : start + 100]
        body = {
            "requests": [
                {
                    "model": f"models/{model}",
                    "content": {"parts": [{"text": t}]},
                    "taskType": task_type,
                    "outputDimensionality": EMBEDDING_DIM,
                }
                for t in batch
            ]
        }
        data = _post(
            f"{GEMINI_BASE}/{model}:batchEmbedContents",
            body,
            headers={"x-goog-api-key": settings.gemini_api_key},
        )
        vectors.extend(_normalize(e["values"]) for e in data["embeddings"])
    return vectors


_STOPWORDS = set(
    "a an and are as at be but by can cannot can't do does for from has have how i i'm in is it "
    "its my no not of on or our the this to was what when where which while why will with you "
    "your me after before again any all also get got keep keeps still".split()
)


def _mock_embedding(text: str) -> list[float]:
    """Deterministic bag-of-words hashing embedding; good enough to rank keyword overlap."""
    vec = [0.0] * EMBEDDING_DIM
    words = [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in _STOPWORDS]
    words = [w[:-1] if len(w) > 4 and w.endswith("s") else w for w in words]
    for w in words:
        h = int.from_bytes(hashlib.md5(w.encode()).digest()[:4], "little")
        vec[h % EMBEDDING_DIM] += 1.0
    return _normalize(vec)


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm else vec


# ---------------------------------------------------------------- generation


def generate(system: str, prompt: str) -> tuple[str, str]:
    """Return (text, provider_used). Falls back to the other hosted provider on failure."""
    primary = settings.llm_provider
    if primary == "mock":
        return _mock_generate(prompt), "mock"

    order = [primary] + [p for p in ("gemini", "groq") if p != primary]
    errors = []
    for provider in order:
        key = settings.gemini_api_key if provider == "gemini" else settings.groq_api_key
        if not key:
            continue
        try:
            text = _gemini_generate(system, prompt) if provider == "gemini" else _groq_generate(system, prompt)
            if text.strip():
                return text.strip(), provider
            errors.append(f"{provider}: empty response")
        except Exception as exc:  # try the next provider
            logger.warning("LLM provider %s failed: %s", provider, exc)
            errors.append(f"{provider}: {exc}")
    raise LLMError("All LLM providers failed: " + "; ".join(errors) if errors else "No LLM API key configured")


def _gemini_generate(system: str, prompt: str) -> str:
    model = settings.gemini_llm_model
    data = _post(
        f"{GEMINI_BASE}/{model}:generateContent",
        {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"thinkingConfig": {"thinkingLevel": "low"}},
        },
        headers={"x-goog-api-key": settings.gemini_api_key},
    )
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts if not p.get("thought"))


def _groq_generate(system: str, prompt: str) -> str:
    data = _post(
        GROQ_URL,
        {
            "model": settings.groq_llm_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "temperature": 0.2,
            "reasoning_effort": "low",
        },
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
    )
    return data["choices"][0]["message"]["content"] or ""


def _mock_generate(prompt: str) -> str:
    """Extractive answer: turns the first context's lines into numbered steps, citing [1]."""
    match = re.search(r"\[1\][^\n]*\n(.*?)(?=\n\[\d+\]|\Z)", prompt, re.S)
    if not match:
        return "NO_ANSWER"
    lines = [
        re.sub(r"^\s*(?:[-*]|\d+[.)])\s*", "", line).strip()
        for line in match.group(1).splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    steps = [line for line in lines if len(line) > 15][:5]
    if not steps:
        return "NO_ANSWER"
    return "\n".join(f"{i}. {step} [1]" for i, step in enumerate(steps, 1))


# ---------------------------------------------------------------- http


def _post(url: str, body: dict, headers: dict) -> dict:
    try:
        response = httpx.post(url, json=body, headers=headers, timeout=TIMEOUT)
    except httpx.HTTPError as exc:
        raise LLMError(f"network error calling {url.split('?')[0]}: {exc}") from exc
    if response.status_code != 200:
        raise LLMError(f"HTTP {response.status_code}: {response.text[:300]}")
    return response.json()
