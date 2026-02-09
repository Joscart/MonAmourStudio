import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ── TipoProducto Schemas ──────────────────────────────────────────────────────


class TipoProductoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)


class TipoProductoResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    created_at: datetime

    model_config = {"from_attributes": True}

# ── Garantía Schemas ──────────────────────────────────────────────────────


class GarantiaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    dias: int = Field(..., ge=1)


class GarantiaResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    dias: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Empaque Schemas ───────────────────────────────────────────────────────


class EmpaqueCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)


class EmpaqueResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Descuento Schemas ─────────────────────────────────────────────────────


class DescuentoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    porcentaje: float = Field(..., gt=0, le=100)


class DescuentoResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    porcentaje: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Tamaño Schemas ────────────────────────────────────────────────────────


class TamanoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=20)
    ancho_cm: float = Field(..., gt=0)
    alto_cm: float = Field(..., gt=0)
    precio_adicional: Decimal = Field(default=0, ge=0)


class TamanoResponse(BaseModel):
    id: uuid.UUID
    producto_id: uuid.UUID
    nombre: str
    ancho_cm: float
    alto_cm: float
    precio_adicional: Decimal

    model_config = {"from_attributes": True}

# ── Producto Schemas ──────────────────────────────────────────────────────────


class ProductoCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=80)
    nombre: str = Field(..., min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: Decimal = Field(..., ge=0, decimal_places=2)
    moneda: str = Field(default="USD", max_length=10)
    disponibilidad: int = Field(default=0, ge=0)
    max_por_pedido: int = Field(default=1, ge=1)
    imagen_url: Optional[str] = None
    envio_gratis_umbral: Optional[Decimal] = Field(None, ge=0)
    tipo_producto_id: Optional[uuid.UUID] = None
    garantia_id: Optional[uuid.UUID] = None
    empaque_id: Optional[uuid.UUID] = None
    descuento_id: Optional[uuid.UUID] = None
    imagen_preview_url: Optional[str] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: Optional[Decimal] = Field(None, ge=0)
    disponibilidad: Optional[int] = Field(None, ge=0)
    max_por_pedido: Optional[int] = Field(None, ge=1)
    imagen_url: Optional[str] = None
    envio_gratis_umbral: Optional[Decimal] = Field(None, ge=0)
    tipo_producto_id: Optional[uuid.UUID] = None
    garantia_id: Optional[uuid.UUID] = None
    empaque_id: Optional[uuid.UUID] = None
    descuento_id: Optional[uuid.UUID] = None
    imagen_preview_url: Optional[str] = None


class ProductoResponse(BaseModel):
    id: uuid.UUID
    sku: str
    nombre: str
    descripcion: Optional[str] = None
    precio: Decimal
    moneda: str
    disponibilidad: int
    max_por_pedido: int
    imagen_url: Optional[str] = None
    envio_gratis_umbral: Optional[Decimal] = None
    imagen_preview_url: Optional[str] = None
    calificacion_promedio: float = 0.0
    total_resenas: int = 0

    tipo_producto_id: Optional[uuid.UUID] = None
    garantia_id: Optional[uuid.UUID] = None
    empaque_id: Optional[uuid.UUID] = None
    descuento_id: Optional[uuid.UUID] = None

    tipo_producto_nombre: Optional[str] = None
    garantia_nombre: Optional[str] = None
    garantia_dias: Optional[int] = None
    empaque_nombre: Optional[str] = None
    descuento_nombre: Optional[str] = None
    descuento_porcentaje: Optional[float] = None

    tamanos: list[TamanoResponse] = []

    created_at: datetime

    model_config = {"from_attributes": True}


# ── Reseña Schemas ────────────────────────────────────────────────────────────


class ResenaCreate(BaseModel):
    calificacion: int = Field(..., ge=1, le=5)
    comentario: Optional[str] = Field(None, max_length=2000)


class ResenaResponse(BaseModel):
    id: uuid.UUID
    producto_id: uuid.UUID
    usuario_id: uuid.UUID
    usuario_nombre: str
    calificacion: int
    comentario: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── ReglaDisponibilidad Schemas ───────────────────────────────────────────────


class ReglaDisponibilidadCreate(BaseModel):
    producto_id: uuid.UUID
    tipo: str = Field(..., min_length=1, max_length=50)
    limite_por_pedido: int = Field(default=1, ge=1)
    ventana_inicio: Optional[datetime] = None
    ventana_fin: Optional[datetime] = None


class ReglaDisponibilidadResponse(BaseModel):
    id: uuid.UUID
    producto_id: uuid.UUID
    tipo: str
    limite_por_pedido: int
    ventana_inicio: Optional[datetime] = None
    ventana_fin: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Stock Reservation Schemas ─────────────────────────────────────────────────


class ReserveStockRequest(BaseModel):
    producto_id: uuid.UUID
    cantidad: int = Field(..., ge=1)
    pedido_id: uuid.UUID


class ReserveStockResponse(BaseModel):
    success: bool
    message: str


# ── Image Upload Schemas ──────────────────────────────────────────────────────


class ImageUploadResponse(BaseModel):
    url: str
    object_name: str
