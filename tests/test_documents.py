import io
import pymupdf
from fastapi.testclient import TestClient


def _make_pdf(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 72), text, fontsize=12)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def test_upload_pdf(client: TestClient, auth_headers):
    pdf = _make_pdf("This is a test document about machine learning.")
    r = client.post(
        "/documents",
        files={"file": ("test.pdf", pdf, "application/pdf")},
        data={"title": "ML Doc"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["filename"] == "test.pdf"
    assert data["title"] == "ML Doc"
    assert data["num_chunks"] >= 1


def test_upload_invalid_file(client: TestClient, auth_headers):
    r = client.post(
        "/documents",
        files={"file": ("note.txt", b"not a pdf", "text/plain")},
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_upload_fake_pdf(client: TestClient, auth_headers):
    r = client.post(
        "/documents",
        files={"file": ("fake.pdf", b"this is not a real pdf", "application/pdf")},
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_list_documents(client: TestClient, auth_headers):
    r = client.get("/documents", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_document(client: TestClient, auth_headers):
    pdf = _make_pdf("Document retrieval test content.")
    doc = client.post(
        "/documents",
        files={"file": ("retrieval.pdf", pdf, "application/pdf")},
        headers=auth_headers,
    ).json()
    r = client.get(f"/documents/{doc['id']}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == doc["id"]


def test_document_chunks(client: TestClient, auth_headers):
    pdf = _make_pdf("Chunks test content about neural networks and deep learning.")
    doc = client.post(
        "/documents",
        files={"file": ("chunks.pdf", pdf, "application/pdf")},
        headers=auth_headers,
    ).json()
    r = client.get(f"/documents/{doc['id']}/chunks", headers=auth_headers)
    assert r.status_code == 200
    chunks = r.json()
    assert len(chunks) >= 1
    assert all("content" in c for c in chunks)


def test_document_ownership(client: TestClient, auth_headers):
    pdf = _make_pdf("Private document content.")
    doc = client.post(
        "/documents",
        files={"file": ("private.pdf", pdf, "application/pdf")},
        headers=auth_headers,
    ).json()
    client.post("/auth/register", json={"email": "docother8@example.com", "password": "password123"})
    tok2 = client.post("/auth/login", data={"username": "docother8@example.com", "password": "password123"}).json()["access_token"]
    r = client.get(f"/documents/{doc['id']}", headers={"Authorization": f"Bearer {tok2}"})
    assert r.status_code == 404
    from app.database import SessionLocal
    from app.models import User
    from sqlalchemy import select
    with SessionLocal() as db:
        u = db.scalars(select(User).where(User.email == "docother8@example.com")).first()
        if u:
            db.delete(u); db.commit()


def test_delete_document(client: TestClient, auth_headers):
    pdf = _make_pdf("Delete me document.")
    doc = client.post(
        "/documents",
        files={"file": ("deleteme.pdf", pdf, "application/pdf")},
        headers=auth_headers,
    ).json()
    r = client.delete(f"/documents/{doc['id']}", headers=auth_headers)
    assert r.status_code == 204
    r2 = client.get(f"/documents/{doc['id']}", headers=auth_headers)
    assert r2.status_code == 404
