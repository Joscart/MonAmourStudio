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


# ── Configuración Tienda Schemas ──────────────────────────────────────────────


class ConfiguracionTiendaUpdate(BaseModel):
    logo_url: Optional[str] = None
    email_contacto: Optional[str] = None
    email_soporte: Optional[str] = None
    telefono_contacto: Optional[str] = None
    telefono_soporte: Optional[str] = None
    envio_gratis_desde: Optional[float] = None
    costo_envio: Optional[float] = None
    instagram_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    whatsapp_url: Optional[str] = None
    color_primary_h: Optional[int] = None
    color_primary_s: Optional[int] = None
    color_primary_l: Optional[int] = None
    color_accent_h: Optional[int] = None
    color_accent_s: Optional[int] = None
    color_accent_l: Optional[int] = None


class ConfiguracionTiendaResponse(BaseModel):
    id: Optional[uuid.UUID] = None
    logo_url: Optional[str] = None
    email_contacto: Optional[str] = None
    email_soporte: Optional[str] = None
    telefono_contacto: Optional[str] = None
    telefono_soporte: Optional[str] = None
    envio_gratis_desde: Optional[float] = None
    costo_envio: Optional[float] = None
    instagram_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    whatsapp_url: Optional[str] = None
    color_primary_h: int = 340
    color_primary_s: int = 60
    color_primary_l: int = 65
    color_accent_h: int = 38
    color_accent_s: int = 70
    color_accent_l: int = 50
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
