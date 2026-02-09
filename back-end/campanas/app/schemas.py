import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Campaña Schemas ───────────────────────────────────────────────────────────


class CampanaCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=255)
    mensaje_global: str = Field(..., min_length=1)
    segmentacion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime


class CampanaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=255)
    mensaje_global: Optional[str] = Field(None, min_length=1)
    segmentacion: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    activa: Optional[bool] = None


class CampanaResponse(BaseModel):
    id: uuid.UUID
    titulo: str
    mensaje_global: str
    segmentacion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime
    activa: bool
    created_at: datetime
    publicaciones_count: int = 0

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, campana) -> "CampanaResponse":
        return cls(
            id=campana.id,
            titulo=campana.titulo,
            mensaje_global=campana.mensaje_global,
            segmentacion=campana.segmentacion,
            fecha_inicio=campana.fecha_inicio,
            fecha_fin=campana.fecha_fin,
            activa=campana.activa,
            created_at=campana.created_at,
            publicaciones_count=len(campana.publicaciones)
            if campana.publicaciones
            else 0,
        )


# ── Publicación Schemas ──────────────────────────────────────────────────────


class PublicacionCreate(BaseModel):
    campana_id: uuid.UUID
    tipo_media: str = Field(..., min_length=1, max_length=50)
    media_url: Optional[str] = None
    caption: str = Field(..., min_length=1)
    canal: str = Field(..., min_length=1, max_length=100)
    scheduled_at: Optional[datetime] = None


class PublicacionResponse(BaseModel):
    id: uuid.UUID
    campana_id: uuid.UUID
    tipo_media: str
    media_url: Optional[str] = None
    caption: str
    canal: str
    scheduled_at: Optional[datetime] = None
    publicada: bool
    created_at: datetime

    model_config = {"from_attributes": True}
