import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ── Producto Schemas ──────────────────────────────────────────────────────────


class ProductoCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=80)
    nombre: str = Field(..., min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: Decimal = Field(..., ge=0, decimal_places=2)
    moneda: str = Field(default="USD", max_length=10)
    stock: int = Field(default=0, ge=0)
    imagen_url: Optional[str] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: Optional[Decimal] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    imagen_url: Optional[str] = None


class ProductoResponse(BaseModel):
    id: uuid.UUID
    sku: str
    nombre: str
    descripcion: Optional[str] = None
    precio: Decimal
    moneda: str
    stock: int
    imagen_url: Optional[str] = None
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
