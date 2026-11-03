import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

import aio_pika
from redis.exceptions import RedisError

log = logging.getLogger(__name__)
EXCHANGE = "eventos"
QUEUE = "pujaz.notificaciones"

def generate_notifications(routing_key, body):
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("El evento debe ser un objeto JSON")
        
    created_at = data.get("occurredAt", datetime.now(timezone.utc).isoformat())
    notifs = []
    
    if routing_key == "UsuarioRegistrado":
        user_id = str(data.get("userId", ""))
        if user_id and user_id != "None":
            notifs.append({
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "type": "WELCOME",
                "message": "¡Bienvenido a Pujaz!",
                "auctionId": None,
                "createdAt": created_at
            })
    elif routing_key == "PujaSuperada":
        user_id = str(data.get("userId", data.get("user_id", "")))
        if user_id and user_id != "None":
            notifs.append({
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "type": "OUTBID",
                "message": "Tu puja ha sido superada",
                "auctionId": str(data.get("auctionId", data.get("auction_id"))),
                "createdAt": created_at
            })
    elif routing_key == "SubastaCerrada":
        winner_id = str(data.get("winnerId", "")) if data.get("winnerId") else None
        participants = data.get("participantIds", [])
        auction_id = str(data.get("auctionId", data.get("auction_id")))
        
        if winner_id and winner_id not in ("None", "0", ""):
            notifs.append({
                "id": str(uuid.uuid4()),
                "userId": winner_id,
                "type": "AUCTION_WON",
                "message": "¡Felicidades, ganaste la subasta!",
                "auctionId": auction_id,
                "createdAt": created_at
            })
        
        for p in participants:
            p_str = str(p)
            if p_str and p_str != winner_id and p_str not in ("None", "0", ""):
                notifs.append({
                    "id": str(uuid.uuid4()),
                    "userId": p_str,
                    "type": "AUCTION_LOST",
                    "message": "La subasta ha finalizado y alguien más ganó",
                    "auctionId": auction_id,
                    "createdAt": created_at
                })
                
    return notifs

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
            notifs = generate_notifications(message.routing_key, message.body)
        except (ValueError, UnicodeError, Exception) as exc:
            log.warning("Evento inválido rechazado; routing_key=%s, error=%s", message.routing_key, exc)
            await message.reject(requeue=False)
            return
        if not notifs:
            await message.ack()
            return
        try:
            for notice in notifs:
                await self.redis.lpush("notificaciones:" + notice["userId"], json.dumps(notice, ensure_ascii=False))
                log.info("Notificación guardada; tipo=%s, user=%s", notice["type"], notice["userId"])
        except RedisError:
            log.warning("Redis no disponible; se reintentará la entrega")
            await asyncio.sleep(1)
            await message.nack(requeue=True)
            return
        await message.ack()

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
                    await asyncio.Future()
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
