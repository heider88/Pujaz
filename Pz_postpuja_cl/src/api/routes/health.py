from fastapi import APIRouter, Request, Response

from src.infrastructure.db.mongo import mongo_disponible

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(request: Request, response: Response):
    # Sano si llega a su base. El broker se informa, pero no tumba el servicio: la API de
    # consulta sigue funcionando y los eventos esperan en la cola.
    mongo = mongo_disponible()
    consumidor = getattr(request.app.state, "consumidor", None)
    if not mongo:
        response.status_code = 503
    return {
        "status": "ok" if mongo else "error",
        "mongo": "ok" if mongo else "error",
        "eventos": "desactivado" if consumidor is None else ("ok" if consumidor.conectado else "conectando"),
    }
