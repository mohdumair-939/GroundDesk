"""FastAPI entry point. Run locally with: uvicorn app.main:app --reload --port 8010"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import check_database
from app.routers import auth, staff, tickets, users

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)


@app.middleware("http")
async def json_server_errors(request: Request, call_next):
    """Turn crashes into a JSON 500 *inside* the CORS layer. Without this, Starlette's outermost
    error handler answers without CORS headers and browsers report a network failure instead."""
    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)


# Added last, so it is the outermost layer and also covers the error responses above.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(staff.router)
app.include_router(users.router)


@app.get("/health")
def health():
    db = check_database()
    status = "ok" if db["database"] == "connected" else "degraded"
    # RENDER_GIT_COMMIT is set by Render, so the deployed version can be checked from outside.
    return {"status": status, **db, "version": os.getenv("RENDER_GIT_COMMIT", "dev")[:7]}
