"""KAN-73: la entrega se crea al llegar SubastaCerrada."""
import asyncio
import json

from src.core.services.entrega_service import EntregaService
from src.infrastructure.db.mongo import entregas_collection
from src.infrastructure.eventos.consumidor import ConsumidorSubastaCerrada, procesar_cuerpo


def evento(**cambios) -> bytes:
    # Formato real de Pz_subastas_cl: winnerId como número y sin closedAt.
    datos = {
        "auctionId": "a1",
        "itemId": "i1",
        "winnerId": 7,
        "amount": 150000,
    }
    datos.update(cambios)
    return json.dumps(datos).encode()


def test_crea_la_entrega_pendiente_del_ganador():
    assert procesar_cuerpo(evento(), EntregaService()) == "ok"
    doc = entregas_collection.find_one({"auctionId": "a1"})
    assert doc["winnerId"] == "7"
    assert doc["amount"] == 150000
    assert doc["status"] == "PENDING"
    assert doc["confirmedAt"] is None


def test_acepta_closed_at_si_viene_y_ids_como_texto():
    assert procesar_cuerpo(evento(winnerId="9", closedAt="2026-11-02T20:00:00Z"), EntregaService()) == "ok"
    doc = entregas_collection.find_one({"auctionId": "a1"})
    assert doc["winnerId"] == "9"
    assert doc["createdAt"].isoformat().startswith("2026-11-02T20:00:00")


def test_el_mismo_evento_dos_veces_no_duplica_la_entrega():
    procesar_cuerpo(evento(), EntregaService())
    procesar_cuerpo(evento(), EntregaService())
    assert entregas_collection.count_documents({"auctionId": "a1"}) == 1


def test_subasta_sin_pujas_no_crea_entrega():
    assert procesar_cuerpo(evento(winnerId=None, amount=None), EntregaService()) == "sin-ganador"
    assert entregas_collection.count_documents({}) == 0


def test_mensaje_mal_formado_se_marca_invalido():
    assert procesar_cuerpo(b"no es json", EntregaService()) == "invalido"
    assert procesar_cuerpo(json.dumps({"auctionId": "a1"}).encode(), EntregaService()) == "invalido"
    assert entregas_collection.count_documents({}) == 0


class MensajeFalso:
    def __init__(self, cuerpo: bytes, routing_key: str = "SubastaCerrada"):
        self.body = cuerpo
        self.routing_key = routing_key
        self.resultado = None

    async def ack(self):
        self.resultado = "ack"

    async def reject(self, requeue: bool):
        self.resultado = f"reject requeue={requeue}"

    async def nack(self, requeue: bool):
        self.resultado = f"nack requeue={requeue}"


class ServicioRoto(EntregaService):
    def registrar_cierre(self, evento):
        raise RuntimeError("Mongo caído")


def recibir(cuerpo: bytes, servicio: EntregaService, routing_key: str = "SubastaCerrada") -> str:
    mensaje = MensajeFalso(cuerpo, routing_key)
    asyncio.run(ConsumidorSubastaCerrada(servicio)._al_recibir(mensaje))
    return mensaje.resultado


def test_confirma_al_broker_el_mensaje_procesado():
    assert recibir(evento(), EntregaService()) == "ack"


def test_descarta_el_mensaje_invalido_sin_reintentar():
    assert recibir(b"{", EntregaService()) == "reject requeue=False"


def test_si_falla_la_base_devuelve_el_mensaje_a_la_cola():
    assert recibir(evento(), ServicioRoto()) == "nack requeue=True"


def test_ignora_los_otros_eventos_del_exchange():
    # PujaSuperada también llega por el fanout: se confirma sin crear nada.
    assert recibir(json.dumps({"auctionId": 1, "userId": 7, "amount": 1000}).encode(), EntregaService(), "PujaSuperada") == "ack"
    assert entregas_collection.count_documents({}) == 0
