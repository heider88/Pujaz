"""Modelos de Pz_postpuja_cl: la entrega de una pieza ganada y el evento SubastaCerrada."""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EstadoEntrega(str, Enum):
    # Se creó al cerrar la subasta; el ganador aún no confirma que recibió la pieza.
    PENDING = "PENDING"
    # El ganador confirmó que recibió la pieza.
    CONFIRMED = "CONFIRMED"


class Entrega(BaseModel):
    """Lo que devuelve la API REST. Los nombres siguen el tipo Delivery del contrato GraphQL."""

    id: str
    auctionId: str
    itemId: str
    winnerId: str
    amount: float
    status: EstadoEntrega
    createdAt: datetime
    confirmedAt: Optional[datetime] = None


class SubastaCerrada(BaseModel):
    """Evento SubastaCerrada que publica Pz_cierre_cl en Pz_eventos_mq.

    winnerId y amount vienen en null si la subasta cerró sin pujas (entonces no hay entrega).
    """

    auctionId: str = Field(..., min_length=1)
    itemId: str = Field(..., min_length=1)
    winnerId: Optional[str] = None
    amount: Optional[float] = None
    closedAt: datetime


class ConfirmarEntrega(BaseModel):
    """Cuerpo de POST /deliveries/{id}/confirm. El gateway pone aquí el id del usuario del JWT."""

    winnerId: str = Field(..., min_length=1)
