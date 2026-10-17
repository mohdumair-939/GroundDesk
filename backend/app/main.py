"""FastAPI entry point. Run locally with: uvicorn app.main:app --reload --port 8010"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import check_database
from app.routers import staff, tickets

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(staff.router)


@app.get("/health")
def health():
    db = check_database()
    status = "ok" if db["database"] == "connected" else "degraded"
    return {"status": status, **db}
