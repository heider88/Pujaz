"""Reglas de las entregas: se crean al cerrar una subasta con ganador y solo el ganador las confirma."""
from datetime import datetime, timezone
from typing import List, Optional

from src.infrastructure.db.entrega_repository import EntregaRepository
from src.models.entrega import Entrega, EstadoEntrega, SubastaCerrada


class EntregaNoEncontrada(Exception):
    """No existe o no es del usuario (no se revela cuál de las dos)."""


class EntregaYaConfirmada(Exception):
    """La entrega ya estaba confirmada."""


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


def _a_utc(fecha: datetime) -> datetime:
    # MongoDB guarda las fechas sin zona; se leen como UTC.
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=timezone.utc)


def _a_entrega(doc: dict) -> Entrega:
    return Entrega(
        id=str(doc["_id"]),
        auctionId=doc["auctionId"],
        itemId=doc["itemId"],
        winnerId=doc["winnerId"],
        amount=doc["amount"],
        status=doc["status"],
        createdAt=_a_utc(doc["createdAt"]),
        confirmedAt=_a_utc(doc["confirmedAt"]) if doc.get("confirmedAt") else None,
    )


class EntregaService:
    def __init__(self, repositorio: Optional[EntregaRepository] = None):
        self.repositorio = repositorio or EntregaRepository()

    def registrar_cierre(self, evento: SubastaCerrada) -> Optional[Entrega]:
        """Reacciona a SubastaCerrada. Sin ganador no hay entrega. Repetir el evento no duplica."""
        if not evento.winnerId or evento.amount is None:
            return None
        doc, _ = self.repositorio.crear_si_no_existe(
            {
                "auctionId": evento.auctionId,
                "itemId": evento.itemId,
                "winnerId": evento.winnerId,
                "amount": evento.amount,
                "status": EstadoEntrega.PENDING.value,
                "createdAt": _a_utc(evento.closedAt),
                "confirmedAt": None,
            }
        )
        return _a_entrega(doc)

    def mis_entregas(self, winner_id: str) -> List[Entrega]:
        return [_a_entrega(doc) for doc in self.repositorio.listar_por_ganador(winner_id)]

    def confirmar(self, entrega_id: str, winner_id: str) -> Entrega:
        actual = self.repositorio.obtener(entrega_id)
        if not actual or actual["winnerId"] != winner_id:
            raise EntregaNoEncontrada()
        if actual["status"] == EstadoEntrega.CONFIRMED.value:
            raise EntregaYaConfirmada()
        confirmada = self.repositorio.confirmar(entrega_id, _ahora())
        if not confirmada:
            # Otra petición la confirmó justo antes.
            raise EntregaYaConfirmada()
        return _a_entrega(confirmada)
