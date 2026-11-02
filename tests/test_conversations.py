from fastapi.testclient import TestClient


def test_create_conversation(client: TestClient, auth_headers):
    r = client.post("/conversations", json={"title": "Test conv"}, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Test conv"
    assert "id" in data


def test_list_conversations(client: TestClient, auth_headers):
    r = client.get("/conversations", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_conversation(client: TestClient, auth_headers):
    conv = client.post("/conversations", json={"title": "Get test"}, headers=auth_headers).json()
    r = client.get(f"/conversations/{conv['id']}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == conv["id"]


def test_update_conversation(client: TestClient, auth_headers):
    conv = client.post("/conversations", json={"title": "Old title"}, headers=auth_headers).json()
    r = client.patch(f"/conversations/{conv['id']}", json={"title": "New title"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["title"] == "New title"


def test_delete_conversation(client: TestClient, auth_headers):
    conv = client.post("/conversations", json={"title": "Delete me"}, headers=auth_headers).json()
    r = client.delete(f"/conversations/{conv['id']}", headers=auth_headers)
    assert r.status_code == 204
    r2 = client.get(f"/conversations/{conv['id']}", headers=auth_headers)
    assert r2.status_code == 404


def test_conversation_ownership(client: TestClient, auth_headers):
    """Another user should get 404 on someone else's conversation."""
    conv = client.post("/conversations", json={"title": "Private"}, headers=auth_headers).json()
    # register a second user
    client.post("/auth/register", json={"email": "other8@example.com", "password": "password123"})
    tok2 = client.post("/auth/login", data={"username": "other8@example.com", "password": "password123"}).json()["access_token"]
    r = client.get(f"/conversations/{conv['id']}", headers={"Authorization": f"Bearer {tok2}"})
    assert r.status_code == 404
    # cleanup
    from app.database import SessionLocal
    from app.models import User
    from sqlalchemy import select
    with SessionLocal() as db:
        u = db.scalars(select(User).where(User.email == "other8@example.com")).first()
        if u:
            db.delete(u); db.commit()


def test_no_token_conversations(client: TestClient):
    r = client.get("/conversations")
    assert r.status_code == 401
