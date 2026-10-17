"""RAG pipeline: retrieve KB chunks for a ticket, apply the insufficient-context guard,
and generate grounded troubleshooting steps."""

import logging
import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.llm_client import embed_query, embedding_model_name, generate
from app.models import AISuggestion, Confidence, KBChunk, KBDocument, Ticket, TicketStatus
from app.ticket_service import change_status

logger = logging.getLogger(__name__)

NO_SOLUTION_TEXT = (
    "No reliable solution was found in the knowledge base for this issue. "
    "Rather than guess, the help desk will escalate it to a technician."
)
NO_ANSWER_MARKER = "NO_ANSWER"
# Chunks slightly below the threshold are still passed to the LLM as supporting context.
CONTEXT_MARGIN = 0.03

SYSTEM_PROMPT = f"""You are an IT help desk assistant. You suggest troubleshooting steps for a support ticket.

Rules:
- Use ONLY the numbered knowledge base excerpts provided. Do not use outside knowledge.
- Write 3 to 7 short numbered steps the user can follow, most likely fix first.
- End each step with the excerpt number(s) it came from, like [1] or [1][2].
- If a relevant "when to escalate" condition applies, add one final line starting with "Escalate if".
- If the excerpts do not contain a solution to this specific problem, reply with exactly {NO_ANSWER_MARKER} and nothing else.
- Plain text only: no headings, no bold, no introduction or closing remarks."""


@dataclass
class Hit:
    chunk: KBChunk
    document: KBDocument
    score: float  # cosine similarity, 1.0 = identical


def ticket_query(ticket: Ticket) -> str:
    return f"{ticket.title}\nCategory: {ticket.category.value}\n\n{ticket.description}"


def retrieve(db: Session, query: str, k: int | None = None) -> list[Hit]:
    """Top-k chunks by cosine similarity, only from docs embedded with the current model."""
    vector = embed_query(query)
    distance = KBChunk.embedding.cosine_distance(vector).label("distance")
    rows = db.execute(
        select(KBChunk, KBDocument, distance)
        .join(KBDocument, KBChunk.document_id == KBDocument.id)
        .where(KBDocument.embedding_model == embedding_model_name())
        .order_by(distance)
        .limit(k or settings.retrieval_top_k)
    ).all()
    return [Hit(chunk=c, document=d, score=round(1 - float(dist), 4)) for c, d, dist in rows]


def confidence_for(score: float) -> Confidence:
    # Gemini similarities sit in a narrow band (relevant ~0.72-0.80, unrelated ~0.60-0.66),
    # so the bands are measured as small margins above the threshold.
    t = settings.similarity_threshold
    if score >= t + settings.confidence_high_margin:
        return Confidence.HIGH
    if score >= t + settings.confidence_medium_margin:
        return Confidence.MEDIUM
    return Confidence.LOW


def build_prompt(ticket: Ticket, hits: list[Hit]) -> str:
    context = "\n\n".join(
        f"[{n}] {h.document.title} ({h.document.category.value})\n{h.chunk.chunk_text}"
        for n, h in enumerate(hits, 1)
    )
    return (
        f"Knowledge base excerpts:\n\n{context}\n\n"
        f"---\nTicket title: {ticket.title}\nCategory: {ticket.category.value}\n"
        f"Description: {ticket.description}\n\n"
        "Write the troubleshooting steps for this ticket."
    )


def _source(n: int, hit: Hit) -> dict:
    return {
        "n": n,
        "document_id": hit.document.id,
        "title": hit.document.title,
        "category": hit.document.category.value,
        "source": hit.document.source,
        "chunk_id": hit.chunk.id,
        "score": hit.score,
    }


def _clean_answer(text: str) -> str:
    # The UI shows plain text, so strip markdown bold/code marks if the model adds them.
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`([^`\n]+)`", r"\1", text)
    return text.strip()


def suggest_for_ticket(db: Session, ticket: Ticket) -> AISuggestion:
    """Run RAG for an OPEN ticket, save the suggestion and move it to SUGGESTION_PROVIDED.

    Raises LLMError if the embedding or LLM provider fails; the ticket then stays OPEN.
    """
    hits = retrieve(db, ticket_query(ticket))
    best = hits[0].score if hits else 0.0
    threshold = settings.similarity_threshold

    if best < threshold:
        # Insufficient-context guard: never ask the LLM when retrieval found nothing relevant.
        suggestion = AISuggestion(
            ticket_id=ticket.id,
            answered=False,
            suggestion_text=NO_SOLUTION_TEXT,
            sources=[_source(n, h) for n, h in enumerate(hits, 1)],
            confidence=None,
            top_score=best,
            provider="guard",
        )
        note = f"No reliable KB match (best score {best:.2f} < {threshold:.2f})"
    else:
        context_hits = [h for h in hits if h.score >= threshold - CONTEXT_MARGIN]
        answer, provider = generate(SYSTEM_PROMPT, build_prompt(ticket, context_hits))
        if NO_ANSWER_MARKER in answer:
            suggestion = AISuggestion(
                ticket_id=ticket.id,
                answered=False,
                suggestion_text=NO_SOLUTION_TEXT,
                sources=[_source(n, h) for n, h in enumerate(context_hits, 1)],
                confidence=None,
                top_score=best,
                provider=provider,
            )
            note = "Retrieved articles did not answer this issue"
        else:
            confidence = confidence_for(best)
            suggestion = AISuggestion(
                ticket_id=ticket.id,
                answered=True,
                suggestion_text=_clean_answer(answer),
                sources=[_source(n, h) for n, h in enumerate(context_hits, 1)],
                confidence=confidence,
                top_score=best,
                provider=provider,
            )
            note = f"AI suggestion generated ({confidence.value} confidence)"

    db.add(suggestion)
    change_status(db, ticket, TicketStatus.SUGGESTION_PROVIDED, note)
    return suggestion
