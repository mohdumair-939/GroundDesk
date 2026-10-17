# Progress Log

Source of truth: `docs/Smart Help Desk Ticketing System — Master Plan.pdf`

## Sprint 0 — Setup and foundation

| # | Sub-sprint | Plan "done when" | Status |
|---|---|---|---|
| 0.1 | Repo with /backend, /frontend, /kb, /docs + README | Repo pushed | **Done** — pushed to github.com/mohdumair-939/IT-Help-Desk-RAG (2026-10-17) |
| 0.2 | FastAPI app with /health and .env config | /docs opens locally | **Done, verified** |
| 0.3 | Neon/Supabase DB, pgvector, SQLAlchemy connection | Health reports DB connected | **Done, verified** on Neon (2026-10-17) |
| 0.4 | React + Vite + Tailwind, API URL from env | Frontend calls /health | **Done, verified** |
| 0.5 | Deploy backend to Render, frontend to Vercel, CORS | Live URLs work end to end | **Done, verified** 2026-10-17 — https://it-help-desk-rag.vercel.app → https://smart-helpdesk-api-w2mf.onrender.com |

### 0.1 — Repository and structure (2026-10-16)
- `git init -b main`. Created `/backend`, `/frontend` and `/kb` (`kb/.gitkeep` for now). `/docs` holds the master plan, unchanged.
- Root `README.md` and `.gitignore`. The `.gitignore` excludes `.env` / `.env.*` but keeps `.env.example`, plus venvs, `node_modules`, build output and editor/OS files.
- Verified with `git check-ignore`: `.env`, `backend/.env`, `frontend/.env.local`, `.venv`, `node_modules` and `__pycache__` are ignored, and `.env.example` stays trackable.

### 0.2 — FastAPI app (2026-10-16)
- `backend/app/main.py` (FastAPI app, CORS, `GET /health`), `backend/app/config.py` (pydantic-settings, reads `backend/.env`), `backend/requirements.txt` (pinned), `backend/.env.example`.
- Python 3.12.15 virtualenv, created with uv.
- Verified on port 8010:
  - `/docs` returns HTTP 200 with the "Smart Help Desk API - Swagger UI" title.
  - `/health` returns `{"status":"degraded","database":"not_configured","pgvector":"unknown"}`.
  - The CORS preflight from an allowed origin returns 200 with `access-control-allow-origin`, and an unlisted origin gets 400.

### 0.3 — Database connection (2026-10-16), code only
- `backend/app/database.py`: SQLAlchemy engine (psycopg 3, `pool_pre_ping`, 10 s connect timeout), `SessionLocal`, and `check_database()`. The check runs `SELECT 1` and looks up the `vector` extension in `pg_extension`.
- `postgresql://` / `postgres://` URLs are rewritten to `postgresql+psycopg://`.
- Verified error handling only. With an unreachable `DATABASE_URL`, `/health` returns `{"status":"degraded","database":"error","pgvector":"unknown"}` without exposing connection details.
- **A real Neon/Supabase connection has NOT been tested.**

### 0.4 — Frontend scaffold (2026-10-16)
- create-vite 9.2.1 React template, with Tailwind CSS v4 through `@tailwindcss/vite`. Demo assets were removed.
- `src/api.js` reads `VITE_API_URL` (default `http://localhost:8010`). `src/App.jsx` shows the backend health status. `frontend/.env.example` added.
- Verified:
  - `npm run lint` (oxlint) is clean.
  - `npm run build` succeeds.
  - Headless Chrome on the Vite dev server (port 5180) rendered "API degraded / Database not_configured / pgvector unknown", and the backend log shows the browser's `GET /health` (cross-origin, CORS allowed).

### 0.5 — Deploy configuration (2026-10-16), not deployed
- `render.yaml` Blueprint: rootDir `backend`, pip build, uvicorn on `$PORT`, health check `/health`, Python 3.12.15. `DATABASE_URL` and `CORS_ORIGINS` are entered in the dashboard.
- Vercel needs no config file. Set the root directory to `frontend` and add `VITE_API_URL`.
- `render.yaml` parses as valid YAML. **Neither Render nor Vercel has been deployed or tested.**

## Sprint 1 — Ticket management (2026-10-17)

| # | Sub-sprint | Status |
|---|---|---|
| 1.1 | Models + Alembic migration | **Done** — `tickets`, `ticket_status_history` created on Neon |
| 1.2 | Validation | **Done** — title 5–120, description ≥20, category/priority enums, email → 422 |
| 1.3 | POST/GET/GET by id/PATCH status | **Done** |
| 1.4 | Status-history logging | **Done** — every change goes through `ticket_service.change_status`; `GET /tickets/{id}/history` |
| 1.5 | UI: create form, list with filters + badges, detail with timeline | **Done**, smoke-tested in headless Chrome |
| 1.6 | pytest scenarios 1–3 | **Done** — 14 tests pass |

- Allowed transitions are enforced (`ALLOWED_TRANSITIONS`); an invalid move returns 409.
- Tests run against a separate `<db>_test` database on the same Neon server, created automatically by `tests/conftest.py`. Run with `.venv\Scripts\python -m pytest` from `backend/`.
- Render now runs `alembic upgrade head` before starting uvicorn.
- `frontend/vercel.json` rewrites all paths to `index.html` so client-side routes work on Vercel.
- Model choices verified on 2026-10-17: Gemini `gemini-embedding-001` (768 dims) and `gemini-3.8-flash`; Groq backup `openai/gpt-oss-120b`. (`gemini-2.5-flash` is no longer available to new keys.)
- The production DB contains one smoke-test ticket (HD-0001); clear it before the demo.

## Sprint 2 — Knowledge base and RAG (2026-10-17)

| # | Sub-sprint | Status |
|---|---|---|
| 2.1 | 15–25 KB docs, tagged by category | **Done** — 21 docs in `/kb` (front matter: `title`, `category`) |
| 2.2 | `ingest.py`: load, chunk (~500 tokens, ~50 overlap), embed, store | **Done** — `python -m app.ingest [--force]`; skips unchanged docs, removes deleted ones |
| 2.3 | Retrieval: pgvector cosine top-4 with scores | **Done** — `rag.retrieve` |
| 2.4 | Insufficient-context guard | **Done** — best score < 0.70 → "no reliable solution", LLM not called |
| 2.5 | Grounded prompt, numbered steps, save suggestion + sources | **Done** — `ai_suggestions` table |
| 2.6 | `POST /tickets/{id}/suggest`, auto-run after creation | **Done** — background task after `POST /tickets`; the UI polls. Provider failure → 503, ticket stays OPEN, "Try again" button |
| 2.7 | UI: suggestion card, sources, High/Medium/Low | **Done** |
| 2.8 | Tests scenarios 4–6 (LLM mocked) | **Done** |

- `llm_client.py` holds every provider call. `LLM_PROVIDER` = gemini | groq | mock; if the primary fails, the other hosted provider is tried. `EMBEDDING_PROVIDER` = gemini | mock. Tests use mock for both (no API calls).
- Threshold calibration with Gemini (2026-10-17): 7 in-KB queries scored 0.72–0.77, 6 out-of-KB queries 0.62–0.66. Confidence: High ≥ 0.76, Medium ≥ 0.73, Low ≥ 0.70 (`CONFIDENCE_*_MARGIN`).
- Every doc fits in a single ~500-token chunk, so there are 21 chunks. Chunk overlap carries trailing words when a paragraph is longer than the overlap budget (bug found and fixed by a test).
- Verified with real Gemini: VPN ticket → High confidence, 7 steps citing the VPN guide. Fan-noise ticket → guard, best 0.64.

## Sprint 3 — Resolution and assignment (2026-10-17)

| # | Sub-sprint | Status |
|---|---|---|
| 3.1 | Seed departments + technicians | **Done** — `python -m app.seed` (idempotent): Network Support, Application Support, Hardware Support, Identity & Access, General IT; 9 technicians. Seeded on the Neon prod DB |
| 3.2 | `POST /tickets/{id}/feedback {resolved, comment}` | **Done** — Yes → RESOLVED. No → ESCALATED → routed → ASSIGNED. "No" is also accepted for OPEN tickets (AI unavailable) |
| 3.3 | `assignment.py`: category rule, keyword fallback, default General IT, least-loaded technician | **Done** — keywords apply to category "Other"; load = ASSIGNED + IN_PROGRESS tickets, ties → lowest id |
| 3.4 | Store `rule_matched` and show the reason | **Done** — `assignments.rule_matched`, assignment panel + timeline note |
| 3.5 | UI: Yes/No buttons, assignment panel, technician view | **Done** — `/technician` page: pick a technician, Start work → In progress → Close |
| 3.6 | Tests scenarios 7–9 | **Done** |

- `PATCH /tickets/{id}/status` now only accepts the technician moves (IN_PROGRESS, CLOSED). RESOLVED/ESCALATED/ASSIGNED/SUGGESTION_PROVIDED come from the suggestion and feedback endpoints (409 otherwise).
- New endpoints: `GET /departments`, `GET /technicians` (with open-ticket counts), and `GET /tickets?technician_id=&department_id=`.
- Render start command: `alembic upgrade head && python -m app.seed && (python -m app.ingest || echo …) && uvicorn …`.
- **Tests: 35 pass.** Run with `.venv\Scripts\python -m pytest` from `backend/`. Two sessions sharing the default `<db>_test` database break each other (`drop_all` at start), so set `TEST_DB_NAME` (must contain "test") for a parallel run.
- The prod DB holds demo tickets HD-0001…HD-0006 from manual and live checks. Clear them before the review.
- Live check (2026-10-17): on Render, the VPN ticket got Gemini, High confidence (0.77) → Yes → RESOLVED, and the fan ticket hit the guard (0.64) → No → Hardware Support / Ananya Das (least loaded). Vercel pages render live data, and CORS allows only the Vercel origin.
- `CORS_ORIGINS` entries now ignore a trailing `/`.

## Added before Sprint 4 — Role-based logins (2026-10-17, owner request)

Not in the master plan; the owner asked for it before Sprint 4.

- **Login page with three separate options:** Login as Employee, Technician, or Admin. The chosen option is sent with the credentials, and an account can only sign in through its own role's option (403 with "Please use the X login" otherwise).
- **One role per email:** `users.email` is unique across all roles, and registration checks for duplicates (case-insensitive) before anything else. Employees self-register; technician and admin accounts are seeded (`python -m app.seed`, password from `DEMO_PASSWORD`, set only on first creation).
- **Auth:** stdlib scrypt password hashes; JWT bearer tokens (`JWT_SECRET`, 12 h) that are valid only for the issuing role and only while the account is active.
- **Employee:** raises tickets (requester taken from the account), sees only their own tickets, answers the AI suggestion, and **approves or rejects closure** (rejecting needs a reason → back to IN_PROGRESS).
- **Technician:** "My queue" shows only their assigned tickets (To do / In progress / Waiting for approval / Closed): Start work → **Mark solved** with a resolution note → `PENDING_APPROVAL`. They can never close a ticket themselves.
- **Admin:** sees all tickets; changes priority/category, reassigns to any technician, force-closes (reason required), reopens RESOLVED/CLOSED tickets, adds notes, and manages users (enable/disable, reset password).
- **Audit:** every timeline entry records who made it (`changed_by`; System for AI/routing). Notes are timeline entries without a status change.
- Tickets a user may not see return 404. New status `PENDING_APPROVAL`; migration `cf3e1f3a003f` adds `users`, `tickets.created_by_id` and `ticket_status_history.changed_by_id`.
- Verified: **54 backend tests pass** (new `tests/test_auth.py`; scenarios 1–9 updated for roles) and a local run against a separate `neondb_dev` database: employee raises → AI guard → escalate → technician starts, marks solved → employee approves → CLOSED. All three role views were screenshotted.
- **Incident (2026-10-17):** a Blueprint sync created a second Render service (`smart-helpdesk-api-yxb6`) that deployed the new code **without** `JWT_SECRET`/`DEMO_PASSWORD`, and seeded the shared prod DB with the then-default password `Demo@1234`. The live admin accepted it. Fixes: `DEMO_PASSWORD` no longer has a default (the seed skips accounts without it); `python -m app.seed --reset-demo-passwords` rotates all 12 seeded accounts. Keep only the `w2mf` service.
- **Deploy needs `JWT_SECRET` and `DEMO_PASSWORD` set in Render** (added to `render.yaml`; an existing Blueprint service may need them added by hand). Old prod tickets HD-0001…0006 have no owner, so only the admin sees them.

## Production login fix (2026-10-18)

- **Symptom:** the live site showed "Could not reach the server" on registration and sign-in. The API itself answered correctly (health 200, CORS allowed, login 401/200), and a clean Chrome profile on the same PC could sign in. The failure was therefore in the browser's direct cross-site call to `*.onrender.com`, which blockers, cached old builds and the Render restart windows all break, and which the app reported with one vague message.
- **Fix:** the frontend now calls `/api/*` on its own origin, and `frontend/vercel.json` forwards it to `smart-helpdesk-api-w2mf`. The browser never contacts onrender.com, so there is no CORS and nothing for a blocker to block. `VITE_API_URL` is now used only in local dev.
- **Errors:** network failures, timeouts, 502–504 (backend starting) and other HTTP errors get distinct messages. Reads and sign-in retry automatically while the backend wakes; registration never retries, so it can't create an account twice. The login and register pages show the server status.
- **Backend bug fixed:** unhandled exceptions returned plain-text 500s *without* CORS headers (seen by browsers as network failures). They now return JSON 500 inside the CORS layer (`tests/test_errors.py`).
- **Password visibility:** an accessible eye/eye-off toggle on login, registration and the admin password reset.
- **Demo passwords:** all 12 seeded accounts were rotated from the leaked `Demo@1234` to `DEMO_PASSWORD` with `python -m app.seed --reset-demo-passwords`. Live: `Demo@1234` → 401; the configured password works for all three roles.
- Frontend tests added (`npm test`, Vitest): 7 tests for the API error handling. Backend: 57 tests pass.
- `docs/DEMO_DATA_AND_TESTING_GUIDE.md`: accounts, staff, actual tickets, KB, features, role walkthroughs and limits.

## Remaining issues / notes

- Local ports 8000 and 5173 are used by other Docker/WSL apps on this machine, so the backend runs on **8010** locally. If 5173 is busy, run the frontend on another port and add that origin to `CORS_ORIGINS`.
- Node v24.22.0 / npm 11.19.1 are installed in `C:\Program Files\nodejs` but are not on the PATH in the agent's shell. They work from a normal terminal.
- The Docker Desktop engine was accidentally stopped during verification on 2026-10-16. The owner needs to restart Docker Desktop.

## External setup required to close Sprint 0

1. ~~Git identity~~ done (repo-local).
2. ~~GitHub repo + push~~ done 2026-10-17.
3. ~~Neon database + pgvector~~ done 2026-10-17. Gemini and Groq keys are in `backend/.env` and tested.
4. Render: deploy the Blueprint from the GitHub repo and set `DATABASE_URL` + `CORS_ORIGINS`.
5. Vercel: import the repo with root dir `frontend` and set `VITE_API_URL` to the Render URL.
6. Share both live URLs so the end-to-end check can be verified (closes 0.5).

## Next approved task

Sprints 1–3 are built and tested locally (2026-10-17). Nothing after the Sprint 0 commit has been committed yet. Sprint 0–3 are deployed. Next: Sprint 4 (dashboard, polish, docs, demo prep).
