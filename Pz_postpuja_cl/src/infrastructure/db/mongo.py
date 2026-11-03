"""Conexión con la base propia de Postpuja (MongoDB). Ningún otro componente la usa."""
import os

from pymongo import ASCENDING, MongoClient

# En docker-compose: mongodb://pz-postpuja-db:27017
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client["pujaz_postpuja"]
entregas_collection = db["entregas"]


def crear_indices() -> None:
    # Una sola entrega por subasta: si el broker entrega dos veces el mismo SubastaCerrada
    # (RabbitMQ garantiza "al menos una vez"), la segunda no crea otra (consumidor idempotente).
    entregas_collection.create_index([("auctionId", ASCENDING)], unique=True)
    # Para "mis entregas", que siempre filtra por ganador.
    entregas_collection.create_index([("winnerId", ASCENDING), ("createdAt", ASCENDING)])


def mongo_disponible() -> bool:
    try:
        client.admin.command("ping")
        return True
    except Exception:
        return False
