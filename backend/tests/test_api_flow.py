import os
from pathlib import Path

from fastapi.testclient import TestClient


DB_PATH = Path(__file__).parent / "test_app.db"
if DB_PATH.exists():
    DB_PATH.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"

from app.main import app  # noqa: E402


client = TestClient(app)


def test_meta_reports_supported_capabilities():
    response = client.get("/api/meta")
    assert response.status_code == 200
    assert "pdf" in response.json()["supported_extensions"]


def test_openapi_exposes_review_and_retry_workflows():
    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/banks/{bank_id}/questions/approve" in paths
    assert "/api/tasks/{task_id}/retry" in paths
    assert "/api/ai/analyze-wrong/{wrong_id}" in paths
    assert "/api/ai/explain/{question_id}/stream" in paths


def test_demo_flow_creates_published_bank_and_dashboard_data():
    load_response = client.post("/api/demo/load")
    assert load_response.status_code == 200

    banks = client.get("/api/banks").json()
    assert banks["total"] >= 2
    assert any(bank["status"] == "published" for bank in banks["items"])

    dashboard = client.get("/api/dashboard").json()
    assert dashboard["stats"]["total_banks"] >= 2
    assert len(dashboard["trend"]) == 7


def test_practice_session_can_be_created_and_resumed():
    client.post("/api/demo/load")
    bank = client.get("/api/banks", params={"status": "published"}).json()["items"][0]

    created = client.post(
        "/api/practice/sessions", json={"bank_id": bank["id"], "mode": "sequential"}
    )
    assert created.status_code == 200
    session = created.json()
    assert session["question_count"] > 0

    saved = client.patch(
        f"/api/practice/sessions/{session['id']}",
        json={"current_index": 1},
    )
    assert saved.status_code == 200
    active = client.get("/api/practice/sessions/active").json()
    assert active["current_index"] == 1
