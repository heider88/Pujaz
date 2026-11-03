"""Modelos de Pz_postpuja_cl: la entrega de una pieza ganada y el evento SubastaCerrada."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator


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
    """Evento SubastaCerrada que publica Pz_subastas_cl en Pz_eventos_mq al cerrar una subasta.

    Formato real (Pz_subastas_cl/src/services/auction_service.go):
    {"auctionId": "12", "itemId": "60d5...", "winnerId": 7, "amount": 150000}
    winnerId viene en null si la subasta cerró sin pujas (entonces no hay entrega).
    """

    auctionId: str = Field(..., min_length=1)
    itemId: str = Field(..., min_length=1)
    winnerId: Optional[str] = None
    amount: Optional[float] = None
    # El publicador no lo manda: si falta, se toma la hora en que llega el evento.
    closedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("auctionId", "itemId", "winnerId", mode="before")
    @classmethod
    def _a_texto(cls, valor: Union[int, str, None]):
        # Subastas manda los ids de usuario y de subasta como número; aquí se guardan como texto,
        # igual que en el contrato GraphQL (ID).
        return str(valor) if isinstance(valor, int) and not isinstance(valor, bool) else valor


class ConfirmarEntrega(BaseModel):
    """Cuerpo de POST /deliveries/{id}/confirm. El gateway pone aquí el id del usuario del JWT."""

    winnerId: str = Field(..., min_length=1)
