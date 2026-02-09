import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    EntregaCreate,
    EntregaReagendar,
    EntregaResponse,
    EntregaUpdateEstado,
)
from app.services.entregas import EntregaService

router = APIRouter(prefix="/entregas", tags=["entregas"])
service = EntregaService()


# ── Create Delivery ───────────────────────────────────────────────────────────


@router.post("/", response_model=EntregaResponse, status_code=status.HTTP_201_CREATED)
async def create_delivery(
    data: EntregaCreate,
    db: AsyncSession = Depends(get_db),
):
    """Schedule a new delivery for an order."""
    return await service.create_delivery(db, data)


# ── List Deliveries ──────────────────────────────────────────────────────────


@router.get("/", response_model=List[EntregaResponse])
async def list_deliveries(
    db: AsyncSession = Depends(get_db),
):
    """List all deliveries."""
    return await service.list_deliveries(db)


# ── Get Delivery Detail ──────────────────────────────────────────────────────


@router.get("/{entrega_id}", response_model=EntregaResponse)
async def get_delivery(
    entrega_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get delivery detail by ID."""
    entrega = await service.get_delivery(db, entrega_id)
    if entrega is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrega no encontrada",
        )
    return entrega


# ── Update Status ─────────────────────────────────────────────────────────────


@router.put("/{entrega_id}/estado", response_model=EntregaResponse)
async def update_status(
    entrega_id: uuid.UUID,
    data: EntregaUpdateEstado,
    db: AsyncSession = Depends(get_db),
):
    """Update delivery status and optionally add notes."""
    entrega = await service.update_status(db, entrega_id, data)
    if entrega is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrega no encontrada",
        )
    return entrega


# ── Reschedule ────────────────────────────────────────────────────────────────


@router.put("/{entrega_id}/reagendar", response_model=EntregaResponse)
async def reschedule(
    entrega_id: uuid.UUID,
    data: EntregaReagendar,
    db: AsyncSession = Depends(get_db),
):
    """Reschedule a delivery to a new date."""
    entrega = await service.reschedule(db, entrega_id, data)
    if entrega is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrega no encontrada",
        )
    return entrega


# ── Get Delivery by Order ID ─────────────────────────────────────────────────


@router.get("/pedido/{pedido_id}", response_model=EntregaResponse)
async def get_by_pedido(
    pedido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get delivery by order (pedido) ID."""
    entrega = await service.get_by_pedido(db, pedido_id)
    if entrega is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrega no encontrada para este pedido",
        )
    return entrega
