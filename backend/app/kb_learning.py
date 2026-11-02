"""Learning from escalated tickets: a technician's fix becomes a knowledge-base article.

Flow (each step is explicit, so nothing unverified reaches the AI):
1. The technician marks the ticket solved and ticks "add to the knowledge base"
   -> KBArticle AWAITING_CLOSURE.
2. The employee approves the closure -> PENDING_REVIEW. If they reject it, the fix did not
   work -> REJECTED. An admin force-close also moves it to review, flagged as unconfirmed.
3. An admin edits if needed (removing anything personal or one-off) and publishes ->
   PUBLISHED: the article is chunked and embedded like a /kb file, with origin "ticket",
   so later similar tickets retrieve it and cite it as a source.
"""

import hashlib
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ingest import chunk_text, embedding_input
from app.llm_client import embed_documents, embedding_model_name
from app.models import KBArticle, KBArticleStatus, KBChunk, KBDocument, KBOrigin, Ticket, User

A = KBArticleStatus


def submit_article(db: Session, ticket: Ticket, fields: dict, user: User) -> KBArticle:
    """Called when the ticket is marked solved. A newer submission replaces an unconfirmed one."""
    now = datetime.now(timezone.utc)
    for old in ticket.kb_articles:
        if old.status == A.AWAITING_CLOSURE:
            old.status = A.REJECTED
            old.review_note = "Replaced by a newer submission"
            old.reviewed_at = now
    article = KBArticle(
        ticket_id=ticket.id,
        status=A.AWAITING_CLOSURE,
        category=ticket.category,
        submitted_by_id=user.id,
        **fields,
    )
    db.add(article)
    ticket.kb_articles.append(article)
    return article


def on_ticket_closed(ticket: Ticket, confirmed_by_employee: bool) -> None:
    for article in ticket.kb_articles:
        if article.status == A.AWAITING_CLOSURE:
            article.status = A.PENDING_REVIEW
            article.confirmed_by_employee = confirmed_by_employee


def on_closure_rejected(ticket: Ticket) -> None:
    for article in ticket.kb_articles:
        if article.status == A.AWAITING_CLOSURE:
            article.status = A.REJECTED
            article.review_note = "The employee reported that this fix did not solve the problem"
            article.reviewed_at = datetime.now(timezone.utc)


def article_markdown(article: KBArticle) -> str:
    """The text that is chunked and embedded, laid out like the /kb docs."""
    parts = [f"# {article.title}", f"## Symptoms\n\n{article.problem.strip()}"]
    if article.cause and article.cause.strip():
        parts.append(f"## Cause\n\n{article.cause.strip()}")
    parts.append(f"## Fix\n\n{article.steps.strip()}")
    parts.append(
        "## When to escalate\n\nIf these steps do not fix the problem, escalate the ticket to a technician."
    )
    return "\n\n".join(parts)


def _source(article: KBArticle) -> str:
    return f"ticket-{article.ticket.ticket_code.lower()}-{article.id}"


def build_document(article: KBArticle) -> KBDocument:
    """Embed the article. Raises LLMError if the embedding provider fails (nothing is saved)."""
    body = article_markdown(article)
    chunks = chunk_text(body)
    vectors = embed_documents([embedding_input(article.title, article.category.value, c) for c in chunks])
    return KBDocument(
        source=_source(article),
        origin=KBOrigin.TICKET,
        title=article.title,
        category=article.category,
        content_hash=hashlib.sha256(body.encode()).hexdigest(),
        embedding_model=embedding_model_name(),
        chunks=[
            KBChunk(chunk_index=i, chunk_text=text, embedding=vec)
            for i, (text, vec) in enumerate(zip(chunks, vectors, strict=True))
        ],
    )


def _drop_document(db: Session, article: KBArticle) -> None:
    if article.document is not None:
        db.delete(article.document)
        article.document = None
        db.flush()


def publish(db: Session, article: KBArticle, admin: User, note: str | None = None) -> None:
    document = build_document(article)  # embed first, so a provider failure changes nothing
    _drop_document(db, article)
    db.add(document)
    article.document = document
    article.status = A.PUBLISHED
    article.reviewed_by_id = admin.id
    article.reviewed_at = datetime.now(timezone.utc)
    article.review_note = note


def reject(article: KBArticle, admin: User, note: str) -> None:
    article.status = A.REJECTED
    article.reviewed_by_id = admin.id
    article.reviewed_at = datetime.now(timezone.utc)
    article.review_note = note


def unpublish(db: Session, article: KBArticle, admin: User, note: str) -> None:
    """Take an article out of the AI's knowledge base; it goes back to review for editing."""
    _drop_document(db, article)
    article.status = A.PENDING_REVIEW
    article.reviewed_by_id = admin.id
    article.reviewed_at = datetime.now(timezone.utc)
    article.review_note = f"Unpublished: {note}"


def refresh_published(db: Session, force: bool = False, log=print) -> int:
    """Re-embed published ticket articles whose vectors came from another embedding model
    (retrieval ignores those), or all of them with force. Run by `python -m app.ingest`."""
    model = embedding_model_name()
    count = 0
    for article in db.scalars(select(KBArticle).where(KBArticle.status == A.PUBLISHED)):
        if article.document is not None and article.document.embedding_model == model and not force:
            continue
        document = build_document(article)
        _drop_document(db, article)
        db.add(document)
        article.document = document
        db.commit()
        count += 1
        log(f"re-embedded  {document.source}")
    return count
