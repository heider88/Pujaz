"""KAN-74: consultar y confirmar entregas por REST."""
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.core.services.entrega_service import EntregaService
from src.main import app
from src.models.entrega import SubastaCerrada

client = TestClient(app)


def crear(auction_id: str, winner_id: str, dia: int, amount: float = 100000) -> str:
    entrega = EntregaService().registrar_cierre(
        SubastaCerrada(
            auctionId=auction_id,
            itemId=f"item-{auction_id}",
            winnerId=winner_id,
            amount=amount,
            closedAt=datetime(2026, 11, dia, 15, tzinfo=timezone.utc),
        )
    )
    return entrega.id


def test_lista_solo_las_entregas_del_ganador_de_la_mas_reciente_a_la_mas_antigua():
    crear("a1", "7", dia=1)
    crear("a2", "7", dia=2)
    crear("a3", "9", dia=3)

    respuesta = client.get("/deliveries", params={"winnerId": "7"})
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert [e["auctionId"] for e in datos] == ["a2", "a1"]
    assert datos[0]["status"] == "PENDING"
    assert datos[0]["confirmedAt"] is None
    assert datos[0]["createdAt"].startswith("2026-11-02T15:00:00")


def test_sin_entregas_devuelve_lista_vacia():
    assert client.get("/deliveries", params={"winnerId": "7"}).json() == []


def test_winner_id_es_obligatorio():
    respuesta = client.get("/deliveries")
    assert respuesta.status_code == 400
    assert respuesta.json()["code"] == "BAD_USER_INPUT"


def test_el_ganador_confirma_su_entrega():
    entrega_id = crear("a1", "7", dia=1)
    respuesta = client.post(f"/deliveries/{entrega_id}/confirm", json={"winnerId": "7"})
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["status"] == "CONFIRMED"
    assert datos["confirmedAt"] is not None


def test_otro_usuario_no_puede_confirmarla_y_no_se_revela_que_existe():
    entrega_id = crear("a1", "7", dia=1)
    respuesta = client.post(f"/deliveries/{entrega_id}/confirm", json={"winnerId": "9"})
    assert respuesta.status_code == 404
    assert respuesta.json() == {"code": "NOT_FOUND", "message": "Entrega no encontrada"}
    assert client.get("/deliveries", params={"winnerId": "7"}).json()[0]["status"] == "PENDING"


def test_entrega_inexistente_o_id_mal_formado_responde_404():
    assert client.post("/deliveries/64f1c0aa9b1e8a0012ab34cd/confirm", json={"winnerId": "7"}).status_code == 404
    assert client.post("/deliveries/no-es-un-id/confirm", json={"winnerId": "7"}).status_code == 404


def test_confirmar_dos_veces_responde_bad_user_input():
    entrega_id = crear("a1", "7", dia=1)
    client.post(f"/deliveries/{entrega_id}/confirm", json={"winnerId": "7"})
    respuesta = client.post(f"/deliveries/{entrega_id}/confirm", json={"winnerId": "7"})
    assert respuesta.status_code == 400
    assert respuesta.json()["code"] == "BAD_USER_INPUT"
