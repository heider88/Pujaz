from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app


def test_health_ok_cuando_hay_base():
    with patch("src.api.routes.health.mongo_disponible", return_value=True), TestClient(app) as client:
        respuesta = client.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok", "mongo": "ok", "eventos": "desactivado"}


def test_health_503_sin_base():
    with patch("src.api.routes.health.mongo_disponible", return_value=False), TestClient(app) as client:
        respuesta = client.get("/health")
    assert respuesta.status_code == 503
    assert respuesta.json()["mongo"] == "error"
