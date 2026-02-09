import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Entrega Schemas ───────────────────────────────────────────────────────────


class EntregaCreate(BaseModel):
    pedido_id: uuid.UUID
    direccion: str = Field(..., min_length=1, max_length=500)
    fecha_programada: Optional[datetime] = None


class EntregaResponse(BaseModel):
    id: uuid.UUID
    pedido_id: uuid.UUID
    estado: str
    guia: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    fecha_entrega: Optional[datetime] = None
    direccion: str
    notas: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EntregaUpdateEstado(BaseModel):
    estado: str = Field(..., min_length=1, max_length=50)
    notas: Optional[str] = None


class EntregaReagendar(BaseModel):
    fecha_programada: datetime
