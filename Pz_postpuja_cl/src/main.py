"""Pz_postpuja_cl: lo que pasa después de ganar una subasta (la entrega de la pieza)."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.api.errores import registrar_manejadores
from src.api.routes import entregas, health
from src.infrastructure.db.mongo import crear_indices
from src.infrastructure.eventos import consumidor as eventos

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("postpuja")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        crear_indices()
    except Exception as error:
        log.warning("No se pudieron crear los índices todavía: %s", error)

    app.state.consumidor = None
    tarea = None
    if eventos.RABBITMQ_URL:
        app.state.consumidor = eventos.ConsumidorSubastaCerrada()
        tarea = asyncio.create_task(eventos.iniciar_con_reintentos(app.state.consumidor))
    else:
        log.info("RABBITMQ_URL vacío: no se escuchan eventos (solo API REST)")

    yield

    if tarea:
        tarea.cancel()
    if app.state.consumidor:
        await app.state.consumidor.detener()


app = FastAPI(
    title="Microservicio de Postpuja - Pujaz",
    description="Entregas de las piezas ganadas: se crean con el evento SubastaCerrada y el ganador las confirma",
    version="1.0.0",
    lifespan=lifespan,
)

registrar_manejadores(app)
app.include_router(health.router)
app.include_router(entregas.router)
