"""Adaptador del contrato publicado por Pz_subastas_cl; entrega al menos una vez."""
import asyncio
import json
import logging
from datetime import datetime, timezone

import aio_pika
from redis.exceptions import RedisError

log = logging.getLogger(__name__)
EXCHANGE = "eventos"
QUEUE = "pujaz.notificaciones"
EVENTS = {"PujaSuperada", "SubastaCerrada"}


def notification(routing_key, body):
    if routing_key not in EVENTS:
        return None
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("El evento debe ser un objeto JSON")
    # Los eventos reales usan userId (puja) y winnerId (cierre).
    recipient = data.get("user_id", data.get("userId") if routing_key == "PujaSuperada" else data.get("winnerId"))
    if routing_key == "SubastaCerrada" and recipient in (None, 0, "0", ""):
        return None  # Sin ganador: no se inventa un destinatario.
    if isinstance(recipient, bool) or not isinstance(recipient, (int, str)):
        raise ValueError("Destinatario inválido")
    user_id = str(recipient)
    if not user_id.isascii() or not user_id.isdecimal() or int(user_id) <= 0:
        raise ValueError("user_id debe ser un entero positivo")
    auction = data.get("auctionId", data.get("auction_id"))
    if isinstance(auction, bool) or not isinstance(auction, (str, int)) or not str(auction).strip():
        raise ValueError("Falta auctionId")
    return {
        "user_id": str(int(user_id)),
        "event": routing_key,
        "auction_id": str(auction),
        "message": "Tu puja fue superada" if routing_key == "PujaSuperada" else "La subasta que ganaste ha finalizado",
        "data": data,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


class Consumer:
    def __init__(self, redis, rabbitmq_url):
        self.redis = redis
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.consuming = False

    @property
    def ready(self):
        return bool(self.consuming and self.connection and not self.connection.is_closed
                    and self.connection.connected.is_set() and self.channel and not self.channel.is_closed)

    async def receive(self, message):
        try:
            if len(message.body) > 65536:
                raise ValueError("Mensaje demasiado grande")
            notice = notification(message.routing_key, message.body)
        except (ValueError, UnicodeError):
            log.warning("Evento inválido rechazado; routing_key=%s", message.routing_key)
            await message.reject(requeue=False)
            return
        if notice is None:
            await message.ack()
            return
        try:
            await self.redis.lpush("notificaciones:" + notice["user_id"], json.dumps(notice, ensure_ascii=False))
        except RedisError:
            log.warning("Redis no disponible; se reintentará la entrega")
            await asyncio.sleep(1)
            await message.nack(requeue=True)
            return
        await message.ack()  # Solo confirmar después de persistir.
        log.info("Notificación guardada; evento=%s", notice["event"])

    async def run(self):
        try:
            while True:
                try:
                    self.connection = await aio_pika.connect_robust(self.rabbitmq_url, timeout=5)
                    self.channel = await self.connection.channel()
                    await self.channel.set_qos(prefetch_count=1)
                    exchange = await self.channel.declare_exchange(EXCHANGE, aio_pika.ExchangeType.FANOUT, durable=True)
                    queue = await self.channel.declare_queue(QUEUE, durable=True)
                    await queue.bind(exchange)
                    await queue.consume(self.receive)
                    self.consuming = True
                    log.info("Consumidor de notificaciones conectado")
                    await asyncio.Future()  # connect_robust restaura canal, binding y consumidor.
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    log.warning("Conexión RabbitMQ pendiente (%s); reintento en 5s", type(exc).__name__)
                    await self.close()
                    await asyncio.sleep(5)
        finally:
            await self.close()

    async def close(self):
        self.consuming = False
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
