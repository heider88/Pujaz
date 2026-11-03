import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException
from redis.asyncio import Redis
from redis.exceptions import RedisError

from consumer import Consumer
import json

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app):
    redis = Redis(host=os.getenv("REDIS_HOST", "pz-notificaciones-db"),
                  port=int(os.getenv("REDIS_PORT", "6379")), decode_responses=True,
                  socket_connect_timeout=3, socket_timeout=3)
    consumer = Consumer(redis, os.getenv("RABBITMQ_URL", "amqp://guest:guest@pz-eventos-mq:5672/"))
    app.state.redis = redis
    app.state.consumer = consumer
    task = asyncio.create_task(consumer.run())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        await redis.aclose()


app = FastAPI(title="Pujaz Notificaciones", lifespan=lifespan)


@app.get("/healthz")
async def health():
    try:
        await app.state.redis.ping()
    except RedisError:
        raise HTTPException(503, "Redis no disponible") from None
    if not app.state.consumer.ready:
        raise HTTPException(503, "Consumidor RabbitMQ no disponible")
    return {"status": "ok"}


@app.get("/notificaciones/{user_id}")
async def notifications(user_id: int):
    if user_id <= 0:
        raise HTTPException(422, "user_id debe ser positivo")
    try:
        entries = await app.state.redis.lrange(f"notificaciones:{user_id}", 0, -1)
    except RedisError:
        raise HTTPException(503, "Redis no disponible") from None
    return [json.loads(entry) for entry in entries]
