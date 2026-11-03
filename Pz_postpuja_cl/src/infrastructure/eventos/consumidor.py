"""Consumidor del evento SubastaCerrada (estilo publicar-suscribir con Pz_eventos_mq, RabbitMQ).

Pz_subastas_cl publica todos sus eventos en el exchange `eventos` (tipo fanout) y pone el nombre
del evento como routing key. Como en un fanout todos los suscriptores reciben todo, Postpuja
revisa la routing key y solo procesa SubastaCerrada; los demás eventos se confirman y se ignoran.
Postpuja no conoce a quien publica, solo el evento (bajo acoplamiento). Cola propia y durable:
si Postpuja está caído, los eventos esperan en RabbitMQ y se procesan al volver.
"""
import asyncio
import json
import logging
import os
from typing import Optional

import aio_pika
from aio_pika.abc import AbstractIncomingMessage, AbstractRobustConnection
from pydantic import ValidationError

from src.core.services.entrega_service import EntregaService
from src.models.entrega import SubastaCerrada

log = logging.getLogger("postpuja.eventos")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "")
# Deben coincidir con Pz_subastas_cl y Pz_billetera_cl (exchange "eventos", tipo fanout).
EXCHANGE = os.getenv("EVENTOS_EXCHANGE", "eventos")
EVENTO = os.getenv("EVENTO_SUBASTA_CERRADA", "SubastaCerrada")
COLA = os.getenv("POSTPUJA_COLA", "postpuja.eventos")


def procesar_cuerpo(cuerpo: bytes, servicio: EntregaService) -> str:
    """Procesa un mensaje. Devuelve "ok", "sin-ganador" o "invalido" (para registrar y probar)."""
    try:
        evento = SubastaCerrada.model_validate(json.loads(cuerpo))
    except (json.JSONDecodeError, ValidationError, UnicodeDecodeError):
        return "invalido"
    return "ok" if servicio.registrar_cierre(evento) else "sin-ganador"


class ConsumidorSubastaCerrada:
    def __init__(self, servicio: Optional[EntregaService] = None):
        self.servicio = servicio or EntregaService()
        self.conexion: Optional[AbstractRobustConnection] = None

    @property
    def conectado(self) -> bool:
        return bool(self.conexion and not self.conexion.is_closed)

    async def _al_recibir(self, mensaje: AbstractIncomingMessage) -> None:
        if mensaje.routing_key != EVENTO:
            # Otro evento del mismo exchange (PujaSuperada, etc.): no es para Postpuja.
            await mensaje.ack()
            return
        try:
            # pymongo es síncrono: se corre aparte para no frenar el servidor web.
            resultado = await asyncio.to_thread(procesar_cuerpo, mensaje.body, self.servicio)
        except Exception:
            # Falla de la base: el mensaje vuelve a la cola para intentarlo de nuevo.
            log.exception("No se pudo guardar la entrega; el evento vuelve a la cola")
            await mensaje.nack(requeue=True)
            return
        if resultado == "invalido":
            # Un mensaje mal formado nunca va a funcionar: se descarta para no bloquear la cola.
            log.warning("SubastaCerrada inválido, se descarta: %r", mensaje.body[:200])
            await mensaje.reject(requeue=False)
            return
        log.info("SubastaCerrada procesado (%s)", resultado)
        await mensaje.ack()

    async def iniciar(self) -> None:
        # connect_robust reintenta solo si RabbitMQ se cae o todavía no ha arrancado.
        self.conexion = await aio_pika.connect_robust(RABBITMQ_URL)
        canal = await self.conexion.channel()
        await canal.set_qos(prefetch_count=10)
        exchange = await canal.declare_exchange(EXCHANGE, aio_pika.ExchangeType.FANOUT, durable=True)
        cola = await canal.declare_queue(COLA, durable=True)
        await cola.bind(exchange)
        await cola.consume(self._al_recibir)
        log.info("Escuchando %s en el exchange %s (cola %s)", EVENTO, EXCHANGE, COLA)

    async def detener(self) -> None:
        if self.conexion:
            await self.conexion.close()


async def iniciar_con_reintentos(consumidor: ConsumidorSubastaCerrada) -> None:
    """Primer arranque: si RabbitMQ todavía no está listo, reintenta cada 5 s sin tumbar la API."""
    while True:
        try:
            await consumidor.iniciar()
            return
        except Exception as error:
            log.warning("RabbitMQ no disponible (%s); reintento en 5 s", error)
            await asyncio.sleep(5)
