"""Admin review of knowledge-base articles proposed by technicians from resolved tickets."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import kb_learning
from app.database import get_db
from app.llm_client import LLMError
from app.models import KBArticle, KBArticleStatus, KBDocument, KBOrigin, Role, User
from app.schemas import KBArticleOut, KBArticleUpdate, KBReviewIn, NoteIn
from app.security import require_roles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kb", tags=["knowledge base"])
admin_only = require_roles(Role.ADMIN)
A = KBArticleStatus

ARTICLE_LOAD = (
    selectinload(KBArticle.ticket),
    selectinload(KBArticle.submitted_by),
    selectinload(KBArticle.reviewed_by),
    selectinload(KBArticle.document),
)


def load_article(db: Session, article_id: int, lock: bool = False) -> KBArticle:
    stmt = select(KBArticle).where(KBArticle.id == article_id)
    if lock:
        stmt = stmt.with_for_update(of=KBArticle)
    article = db.scalars(stmt.options(*ARTICLE_LOAD)).first()
    if article is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    return article


def reload_article(db: Session, article_id: int) -> KBArticle:
    db.expire_all()
    return load_article(db, article_id)


def require_status(article: KBArticle, *allowed: KBArticleStatus) -> None:
    if article.status not in allowed:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"This action is not available for a {article.status.value} article"
        )


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(admin_only)) -> dict:
    """Counts for the admin page: articles by review status, and KB documents by origin."""
    by_status = {s.value: 0 for s in KBArticleStatus}
    for s, n in db.execute(select(KBArticle.status, func.count()).group_by(KBArticle.status)):
        by_status[s.value] = n
    by_origin = {o.value: 0 for o in KBOrigin}
    for o, n in db.execute(select(KBDocument.origin, func.count()).group_by(KBDocument.origin)):
        by_origin[o.value] = n
    return {"articles": by_status, "documents": by_origin}


@router.get("/articles", response_model=list[KBArticleOut])
def list_articles(
    status_: KBArticleStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    stmt = select(KBArticle).options(*ARTICLE_LOAD).order_by(KBArticle.id.desc())
    if status_ is not None:
        stmt = stmt.where(KBArticle.status == status_)
    return db.scalars(stmt).all()


@router.get("/articles/{article_id}", response_model=KBArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return load_article(db, article_id)


@router.patch("/articles/{article_id}", response_model=KBArticleOut)
def update_article(
    article_id: int, payload: KBArticleUpdate, db: Session = Depends(get_db), _: User = Depends(admin_only)
):
    """Edit before publishing (e.g. remove names or one-off details, make steps general)."""
    article = load_article(db, article_id, lock=True)
    require_status(article, A.AWAITING_CLOSURE, A.PENDING_REVIEW)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "cause":
            article.cause = value or None  # the cause is optional and may be cleared
        elif value is not None:  # required fields cannot be cleared
            setattr(article, field, value)
    db.commit()
    return reload_article(db, article_id)


@router.post("/articles/{article_id}/publish", response_model=KBArticleOut)
def publish_article(
    article_id: int, payload: KBReviewIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)
):
    """Embed the article into the knowledge base. Only after the ticket was closed."""
    article = load_article(db, article_id, lock=True)
    require_status(article, A.PENDING_REVIEW)
    try:
        kb_learning.publish(db, article, admin, payload.note)
    except LLMError as exc:
        db.rollback()
        logger.warning("Publishing KB article %s failed: %s", article_id, exc)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The embedding service is unavailable right now. Please try again."
        ) from exc
    db.commit()
    return reload_article(db, article_id)


@router.post("/articles/{article_id}/reject", response_model=KBArticleOut)
def reject_article(article_id: int, payload: NoteIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    article = load_article(db, article_id, lock=True)
    require_status(article, A.AWAITING_CLOSURE, A.PENDING_REVIEW)
    kb_learning.reject(article, admin, payload.note)
    db.commit()
    return reload_article(db, article_id)


@router.post("/articles/{article_id}/unpublish", response_model=KBArticleOut)
def unpublish_article(
    article_id: int, payload: NoteIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)
):
    """Remove a published article from the AI's knowledge base; it returns to review."""
    article = load_article(db, article_id, lock=True)
    require_status(article, A.PUBLISHED)
    kb_learning.unpublish(db, article, admin, payload.note)
    db.commit()
    return reload_article(db, article_id)
