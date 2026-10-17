"""Server errors must still carry CORS headers, or browsers report them as network failures."""

from fastapi.testclient import TestClient

from app.main import app

ORIGIN = "http://localhost:5173"  # allowed in tests via the default CORS_ORIGINS


def test_unhandled_error_returns_json_500_with_cors(monkeypatch):
    from app import security

    def explode(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(security, "verify_password", explode)
    monkeypatch.setattr("app.routers.auth.verify_password", explode)
    with TestClient(app, raise_server_exceptions=False) as client:
        r = client.post(
            "/auth/login",
            json={"email": "admin@helpdesk.local", "password": "whatever-123", "role": "admin"},
            headers={"Origin": ORIGIN},
        )
    assert r.status_code == 500
    assert r.json() == {"detail": "Internal server error"}
    assert r.headers.get("access-control-allow-origin") == ORIGIN
