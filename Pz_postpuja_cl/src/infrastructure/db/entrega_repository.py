"""Acceso a la colección de entregas."""
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from pymongo import DESCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError

from src.infrastructure.db.mongo import entregas_collection
from src.models.entrega import EstadoEntrega


def _object_id(texto: str) -> Optional[ObjectId]:
    try:
        return ObjectId(texto)
    except Exception:
        return None


class EntregaRepository:
    def crear_si_no_existe(self, doc: dict) -> tuple[dict, bool]:
        """Crea la entrega de una subasta. Si ya existía, devuelve la existente y False."""
        try:
            resultado = entregas_collection.insert_one(dict(doc))
            return {**doc, "_id": resultado.inserted_id}, True
        except DuplicateKeyError:
            return entregas_collection.find_one({"auctionId": doc["auctionId"]}), False

    def listar_por_ganador(self, winner_id: str) -> List[dict]:
        cursor = entregas_collection.find({"winnerId": winner_id}).sort("createdAt", DESCENDING)
        return list(cursor)

    def obtener(self, entrega_id: str) -> Optional[dict]:
        oid = _object_id(entrega_id)
        return entregas_collection.find_one({"_id": oid}) if oid else None

    def confirmar(self, entrega_id: str, ahora: datetime) -> Optional[dict]:
        """Pasa de PENDING a CONFIRMED en una sola operación (no hay carrera entre dos clics)."""
        oid = _object_id(entrega_id)
        if not oid:
            return None
        return entregas_collection.find_one_and_update(
            {"_id": oid, "status": EstadoEntrega.PENDING.value},
            {"$set": {"status": EstadoEntrega.CONFIRMED.value, "confirmedAt": ahora}},
            return_document=ReturnDocument.AFTER,
        )
