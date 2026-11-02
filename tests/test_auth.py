from fastapi.testclient import TestClient


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_db(client: TestClient):
    r = client.get("/health/db")
    assert r.status_code == 200
    assert r.json()["database"] == "connected"


def test_register_and_login(client: TestClient):
    # register
    r = client.post("/auth/register", json={
        "email": "auth_unique@example.com", "password": "password123", "full_name": "Auth Test"
    })
    assert r.status_code in (201, 409)

    # login
    r = client.post("/auth/login", data={"username": "auth_unique@example.com", "password": "password123"})
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"

    # cleanup
    from app.database import SessionLocal
    from app.models import User
    from sqlalchemy import select
    with SessionLocal() as db:
        u = db.scalars(select(User).where(User.email == "auth_unique@example.com")).first()
        if u:
            db.delete(u); db.commit()


def test_login_wrong_password(client: TestClient, auth_headers):
    r = client.post("/auth/login", data={"username": "testuser_stage8@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_me(client: TestClient, auth_headers):
    r = client.get("/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "testuser_stage8@example.com"
    assert "password_hash" not in data


def test_me_no_token(client: TestClient):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_duplicate_register(client: TestClient):
    r = client.post("/auth/register", json={"email": "testuser_stage8@example.com", "password": "password123"})
    assert r.status_code == 409
