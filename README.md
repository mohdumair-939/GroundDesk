# Smart Help Desk Ticketing System for IT Services

A college mini-project for raising and tracking IT support tickets. When a user creates a ticket, the system looks up a troubleshooting knowledge base and suggests steps based only on the documents it finds (RAG). If it finds nothing relevant enough, it says that no reliable solution is available rather than guessing. Users mark a suggestion as resolved or unresolved. Unresolved tickets go to a department and technician through simple, explainable rules, and the technician moves them through In Progress to Closed.

> **Status:** Sprint 0 (setup and foundation) is built and verified locally. The database connection and live deploy are waiting on account credentials. See [`PROGRESS.md`](PROGRESS.md) for current progress, and the master plan in [`docs/`](docs/) for the full scope.

## Features (planned)

- Create and track IT support tickets (`HD-0001`-style codes), with status history
- Troubleshooting knowledge base (`/kb` markdown docs) chunked and embedded into PostgreSQL + pgvector
- RAG troubleshooting suggestions, with sources and High/Medium/Low confidence
- Insufficient-context guard: no confident answer when retrieval scores are below the threshold
- Resolved / unresolved feedback on suggestions
- Rule-based assignment to a department and the least-loaded technician, with the matched rule shown
- Technician workflow: Assigned → In Progress → Closed
- Dashboard with counts by status, AI-resolved vs escalated, and per department

**Ticket lifecycle:** `OPEN → SUGGESTION_PROVIDED → RESOLVED`, or `→ ESCALATED → ASSIGNED → IN_PROGRESS → CLOSED`.

Out of scope: multi-agent architecture, general chatbots, email integration, ML-based routing.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind CSS (deployed on Vercel) |
| Backend | Python FastAPI (deployed on Render) |
| Database | PostgreSQL + pgvector (Neon or Supabase free tier) |
| ORM / migrations | SQLAlchemy + Alembic |
| Embeddings | Hosted embedding API (Gemini or OpenAI) |
| LLM | Gemini / Groq / OpenAI behind one `llm_client.py`, plus a mock mode |
| Testing | pytest + httpx |

## Repository structure

```
.
├── backend/    FastAPI app: tickets API, RAG pipeline, assignment rules, tests
├── frontend/   React + Vite + Tailwind UI
├── kb/         Troubleshooting knowledge-base markdown documents
├── docs/       Master plan and project documentation
├── README.md
└── PROGRESS.md Sprint progress log
```

## Architecture (planned)

```
React (Vercel)
   | REST/JSON
FastAPI (Render)
   |-- /tickets                 CRUD, validation, status
   |-- /tickets/{id}/suggest    RAG pipeline
   |-- /tickets/{id}/feedback   resolved / unresolved
   |-- assignment.py            rule-based routing
   |
PostgreSQL + pgvector (Neon/Supabase)
   |-- tickets, ticket_status_history, ai_suggestions,
   |   departments, technicians, assignments
   |-- kb_documents, kb_chunks (text + embedding)
```

## Local setup

### Prerequisites

- Git
- Python 3.12 (the same version Render uses)
- Node.js LTS + npm (developed with Node 24)
- A Neon or Supabase PostgreSQL database with the `pgvector` extension enabled
- An API key for the chosen embedding/LLM provider (or `LLM_PROVIDER=mock` for demos), from Sprint 2

### Database (Neon or Supabase)

1. Create a free project and copy its PostgreSQL connection string.
2. Enable pgvector by running this once in the provider's SQL editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Put the connection string in `backend/.env` as `DATABASE_URL`. `postgresql://` URLs are converted for the psycopg driver automatically.

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv            # or: uv venv --python 3.12 .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env, then fill in DATABASE_URL
uvicorn app.main:app --reload --port 8010
```

- Swagger UI: http://localhost:8010/docs
- Health check: http://localhost:8010/health returns `status`, `database` (`connected` / `not_configured` / `error`) and `pgvector` (`enabled` / `not_enabled` / `unknown`).

Port 8010 is used because 8000 is often taken by other local tools.

### Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
copy .env.example .env          # macOS/Linux: cp .env.example .env
npm run dev
```

Open http://localhost:5173. The home page calls the backend `/health` endpoint and shows the result. If port 5173 is busy, run `npm run dev -- --port 5180` and add that origin to `CORS_ORIGINS`.

### Environment variables

Secrets are kept in `.env` files, which Git ignores. Only the `.env.example` files are committed.

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `DATABASE_URL` | Neon/Supabase PostgreSQL connection string |
| `backend/.env` | `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `frontend/.env` | `VITE_API_URL` | Backend base URL |

## Testing

_pytest + httpx. Added from Sprint 1.6 onward and covers the 10 planned test scenarios._

## Deployment

**Backend on Render:** create a Blueprint from this repo. It uses [`render.yaml`](render.yaml) (root dir `backend`, health check `/health`). In the dashboard, set:
- `DATABASE_URL`: the Neon/Supabase connection string
- `CORS_ORIGINS`: your Vercel URL, e.g. `https://your-app.vercel.app`

**Frontend on Vercel:** import the repo and set **Root Directory** to `frontend`. The Vite preset is detected automatically. Set `VITE_API_URL` to the Render URL, e.g. `https://smart-helpdesk-api.onrender.com`. Vite bakes env vars in at build time, so redeploy after changing it.

Render's free tier sleeps when idle, so open the backend URL a minute before a demo.

## Demo

The planned five-minute demo walks through two paths. In the resolved path, a VPN issue gets AI steps that cite the KB, and the user clicks Yes. In the escalated path, a fan noise issue that isn't in the KB gets no confident answer, and the ticket is routed to Hardware with the rule shown. The technician then moves it to In Progress and Closed. The full script is in the master plan.
