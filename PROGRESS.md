# Progress Log

Source of truth: `docs/Smart Help Desk Ticketing System — Master Plan.pdf`

## Sprint 0 — Setup and foundation

| # | Sub-sprint | Plan "done when" | Status |
|---|---|---|---|
| 0.1 | Repo with /backend, /frontend, /kb, /docs + README | Repo pushed | Built locally. **Push pending** (needs GitHub repo + git identity) |
| 0.2 | FastAPI app with /health and .env config | /docs opens locally | **Done, verified** |
| 0.3 | Neon/Supabase DB, pgvector, SQLAlchemy connection | Health reports DB connected | Code done. **Not verified** (needs `DATABASE_URL`) |
| 0.4 | React + Vite + Tailwind, API URL from env | Frontend calls /health | **Done, verified** |
| 0.5 | Deploy backend to Render, frontend to Vercel, CORS | Live URLs work end to end | Config done. **Not deployed** (needs push + accounts) |

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

## Remaining issues / notes

- Local ports 8000 and 5173 are used by other Docker/WSL apps on this machine, so the backend runs on **8010** locally. If 5173 is busy, run the frontend on another port and add that origin to `CORS_ORIGINS`.
- Node v24.22.0 / npm 11.19.1 are installed in `C:\Program Files\nodejs` but are not on the PATH in the agent's shell. They work from a normal terminal.
- No `/health` automated test yet. The plan starts pytest in Sprint 1.6.
- The Docker Desktop engine was accidentally stopped during verification on 2026-10-16. The owner needs to restart Docker Desktop.

## External setup required to close Sprint 0

1. Git `user.name` / `user.email`, for the first commit.
2. An empty GitHub repository URL. Then commit and push (closes 0.1).
3. A Neon (or Supabase) project: run `CREATE EXTENSION IF NOT EXISTS vector;`, then put the connection string in `backend/.env` (closes 0.3).
4. Render: deploy the Blueprint from the GitHub repo and set `DATABASE_URL` + `CORS_ORIGINS`.
5. Vercel: import the repo with root dir `frontend` and set `VITE_API_URL` to the Render URL.
6. Share both live URLs so the end-to-end check can be verified (closes 0.5).

## Next approved task

Close the remaining Sprint 0 items (0.1 push, 0.3 DB verification, 0.5 deploy) once the external setup above is provided. Sprint 1.1 has not been approved yet.
