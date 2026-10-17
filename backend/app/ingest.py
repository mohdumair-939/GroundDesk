"""Load /kb markdown docs, chunk them, embed the chunks and store them in pgvector.

Run from backend/:  python -m app.ingest            (only new or changed docs)
                    python -m app.ingest --force    (re-embed everything)

Each doc starts with front matter:
    ---
    title: VPN will not connect
    category: Network
    ---
"""

import argparse
import hashlib
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.llm_client import embed_documents, embedding_model_name
from app.models import Category, KBChunk, KBDocument

CHUNK_TOKENS = 500
OVERLAP_TOKENS = 50
WORDS_PER_TOKEN = 0.75  # rough English average; avoids a tokenizer dependency


@dataclass
class ParsedDoc:
    source: str
    title: str
    category: Category
    body: str
    content_hash: str


def parse_doc(path: Path) -> ParsedDoc:
    raw = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if not match:
        raise ValueError(f"{path.name}: missing front matter (title/category)")
    meta = dict(
        (k.strip().lower(), v.strip()) for k, v in (line.split(":", 1) for line in match.group(1).splitlines() if ":" in line)
    )
    if "title" not in meta or "category" not in meta:
        raise ValueError(f"{path.name}: front matter needs title and category")
    return ParsedDoc(
        source=path.name,
        title=meta["title"],
        category=Category(meta["category"]),
        body=match.group(2).strip(),
        content_hash=hashlib.sha256(raw.encode()).hexdigest(),
    )


def _words(text: str) -> int:
    return len(text.split())


def chunk_text(body: str, max_tokens: int = CHUNK_TOKENS, overlap_tokens: int = OVERLAP_TOKENS) -> list[str]:
    """Pack paragraphs into ~max_tokens chunks; each new chunk repeats ~overlap_tokens of the last."""
    max_words = int(max_tokens * WORDS_PER_TOKEN)
    overlap_words = int(overlap_tokens * WORDS_PER_TOKEN)

    paragraphs: list[str] = []
    for para in re.split(r"\n\s*\n", body):
        para = para.strip()
        if not para:
            continue
        words = para.split()
        # A single paragraph longer than a chunk is split into word windows.
        while len(words) > max_words:
            paragraphs.append(" ".join(words[:max_words]))
            words = words[max_words - overlap_words :]
        paragraphs.append(" ".join(words) if len(words) != len(para.split()) else para)

    chunks: list[str] = []
    current: list[str] = []
    for para in paragraphs:
        if current and sum(map(_words, current)) + _words(para) > max_words:
            chunks.append("\n\n".join(current))
            # Carry trailing paragraphs (up to the overlap budget) into the next chunk.
            carry: list[str] = []
            for prev in reversed(current):
                if sum(map(_words, carry)) + _words(prev) > overlap_words:
                    break
                carry.insert(0, prev)
            if not carry and overlap_words:  # last paragraph too long: carry its final words
                carry = [" ".join(current[-1].split()[-overlap_words:])]
            current = carry
        current.append(para)
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def embedding_input(doc_title: str, category: str, chunk: str) -> str:
    """Title and category go into the embedded text so short chunks keep their topic."""
    return f"{doc_title}\nCategory: {category}\n\n{chunk}"


def ingest(db: Session, kb_dir: Path | None = None, force: bool = False, log=print) -> dict:
    kb_dir = Path(kb_dir or settings.kb_dir)
    model = embedding_model_name()
    paths = sorted(kb_dir.glob("*.md"))
    existing = {d.source: d for d in db.scalars(select(KBDocument))}
    stats = {"added": 0, "updated": 0, "unchanged": 0, "removed": 0, "chunks": 0}

    for path in paths:
        doc = parse_doc(path)
        old = existing.pop(doc.source, None)
        if old and not force and old.content_hash == doc.content_hash and old.embedding_model == model:
            stats["unchanged"] += 1
            continue

        chunks = chunk_text(doc.body)
        vectors = embed_documents([embedding_input(doc.title, doc.category.value, c) for c in chunks])

        if old:
            db.delete(old)
            db.flush()
        record = KBDocument(
            source=doc.source,
            title=doc.title,
            category=doc.category,
            content_hash=doc.content_hash,
            embedding_model=model,
            chunks=[
                KBChunk(chunk_index=i, chunk_text=text, embedding=vec)
                for i, (text, vec) in enumerate(zip(chunks, vectors, strict=True))
            ],
        )
        db.add(record)
        db.commit()
        stats["updated" if old else "added"] += 1
        stats["chunks"] += len(chunks)
        log(f"{'updated' if old else 'added':>8}  {doc.source}  ({len(chunks)} chunks)")

    for gone in existing.values():  # files deleted from /kb
        db.delete(gone)
        stats["removed"] += 1
        log(f" removed  {gone.source}")
    db.commit()
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest /kb markdown docs into pgvector")
    parser.add_argument("--force", action="store_true", help="re-embed all documents")
    args = parser.parse_args()

    from app.database import SessionLocal

    if SessionLocal is None:
        print("DATABASE_URL is not configured", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        stats = ingest(db, force=args.force)
    print(f"Done with {embedding_model_name()}: {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
