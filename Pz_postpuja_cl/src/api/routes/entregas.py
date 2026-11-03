"""API REST de entregas. Solo la usa el gateway (Pz_api_ag), que saca el winnerId del JWT."""
from typing import List

from fastapi import APIRouter, Depends

from src.api.errores import ErrorApi

from src.core.services.entrega_service import EntregaNoEncontrada, EntregaService, EntregaYaConfirmada
from src.models.entrega import ConfirmarEntrega, Entrega

router = APIRouter(prefix="/deliveries", tags=["entregas"])


def get_entrega_service() -> EntregaService:
    return EntregaService()


@router.get("", response_model=List[Entrega])
def mis_entregas(winnerId: str, service: EntregaService = Depends(get_entrega_service)):
    """Entregas de las subastas que ganó el usuario, de la más reciente a la más antigua."""
    return service.mis_entregas(winnerId)


@router.post("/{entrega_id}/confirm", response_model=Entrega)
def confirmar_entrega(
    entrega_id: str,
    cuerpo: ConfirmarEntrega,
    service: EntregaService = Depends(get_entrega_service),
):
    try:
        return service.confirmar(entrega_id, cuerpo.winnerId)
    except EntregaNoEncontrada:
        # No existe o no es de este usuario: no se revela cuál de las dos.
        raise ErrorApi("NOT_FOUND", "Entrega no encontrada")
    except EntregaYaConfirmada:
        raise ErrorApi("BAD_USER_INPUT", "La entrega ya estaba confirmada")
