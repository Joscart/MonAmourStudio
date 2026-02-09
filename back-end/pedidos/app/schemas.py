import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ── PedidoItem Schemas ────────────────────────────────────────────────────────


class PedidoItemCreate(BaseModel):
    producto_id: uuid.UUID
    variante: Optional[str] = None
    cantidad: int = Field(..., ge=1)
    precio_unitario: Decimal = Field(..., ge=0, decimal_places=2)


class PedidoItemResponse(BaseModel):
    id: uuid.UUID
    producto_id: uuid.UUID
    variante: Optional[str] = None
    cantidad: int
    precio_unitario: Decimal

    model_config = {"from_attributes": True}


# ── Pedido Schemas ────────────────────────────────────────────────────────────


class PedidoCreate(BaseModel):
    usuario_id: uuid.UUID
    items: list[PedidoItemCreate] = Field(..., min_length=1)
    direccion_entrega: str = Field(..., min_length=1, max_length=500)
    coordenadas_entrega: Optional[str] = None


class PedidoResponse(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    fecha_creacion: datetime
    estado: str
    subtotal: Decimal
    shipping: Decimal
    total: Decimal
    direccion_entrega: str
    items: list[PedidoItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class PedidoUpdateEstado(BaseModel):
    estado: str = Field(..., min_length=1, max_length=50)


# ── Pago Schemas ──────────────────────────────────────────────────────────────


class PagoRequest(BaseModel):
    pedido_id: uuid.UUID
    monto: Decimal = Field(..., ge=0, decimal_places=2)
    metodo_pago: Optional[str] = Field(default="tarjeta")


class PagoResponse(BaseModel):
    success: bool
    message: str
    transaction_id: Optional[str] = None
