"""
Shared pytest fixtures.

Uses FastAPI's TestClient (sync WSGI-compatible wrapper over httpx) so tests
run without a running server. The real PostgreSQL database is used — tests
create and clean up their own data.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

EMAIL = "testuser_stage8@example.com"
PASSWORD = "testpass123"


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client: TestClient):
    """Register a test user (ignore 409 if already exists), log in, return headers."""
    client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD, "full_name": "Stage8 Test"})
    r = client.post("/auth/login", data={"username": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(client: TestClient, auth_headers):
    yield
    # Remove the test user (cascades to conversations, messages, documents)
    from app.database import SessionLocal
    from app.models import User
    from sqlalchemy import select
    with SessionLocal() as db:
        user = db.scalars(select(User).where(User.email == EMAIL)).first()
        if user:
            db.delete(user)
            db.commit()
