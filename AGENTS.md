# Repository Guidance

## Project state

- Read `README.md` for the architecture and setup, and `PROGRESS.md` before taking on work. The progress log identifies implemented work, pending external setup, and the next approved task.
- Treat planned features in the README and master plan as goals, not as existing behavior. The current backend is a FastAPI health-check scaffold; verify the implementation before extending it.
- Keep changes within the requested scope. Do not commit, deploy, or change external services unless explicitly asked.

## Structure

- `backend/`: FastAPI application and Python dependencies.
- `frontend/`: React + Vite application.
- `kb/`: troubleshooting knowledge-base documents.
- `docs/`: project plan and documentation.

## Local commands

Run backend commands from `backend/`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

Run frontend commands from `frontend/`:

```powershell
npm install
npm run dev
npm run lint
npm run build
```

There is no configured automated test command yet. Do not report tests as passing unless a test suite has been added and run.

## Implementation expectations

- Follow the existing FastAPI, SQLAlchemy, Pydantic Settings, React, and Vite patterns in the owning area; avoid introducing another framework without a clear need.
- Keep credentials in ignored `.env` files. Update `.env.example` when adding configuration, and never commit secrets.
- For future knowledge-base answers, ground suggestions in retrieved documents and their sources. If the retrieved context is insufficient, do not invent troubleshooting steps; return the project's no-reliable-solution outcome.
- Keep ticket assignment explainable and rule-based, consistent with the project scope.
- Update `PROGRESS.md` when a change materially advances or alters a planned sprint item.