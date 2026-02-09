import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas import (
    PagoRequest,
    PagoResponse,
    PedidoCreate,
    PedidoResponse,
    PedidoUpdateEstado,
)
from app.services.pedidos import PedidoService

router = APIRouter(prefix="/pedidos", tags=["pedidos"])
security = HTTPBearer()
service = PedidoService()


# ── Auth Dependency ───────────────────────────────────────────────────────────


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate JWT and return the payload (sub = user_id)."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sin subject",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    return {
        "id": uuid.UUID(user_id),
        "email": payload.get("email"),
        "rol": payload.get("rol", "cliente"),
    }


# ── Create Order ──────────────────────────────────────────────────────────────


@router.post("/", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: PedidoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new order with its items."""
    return await service.create_order(db, data)


# ── List Orders ───────────────────────────────────────────────────────────────


@router.get("/", response_model=List[PedidoResponse])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    usuario_id: Optional[uuid.UUID] = Query(None, description="Filter by user ID"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List orders, optionally filtered by usuario_id."""
    return await service.list_orders(db, usuario_id=usuario_id, offset=offset, limit=limit)


# ── Get Order Detail ──────────────────────────────────────────────────────────


@router.get("/{pedido_id}", response_model=PedidoResponse)
async def get_order(
    pedido_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get order detail with items."""
    pedido = await service.get_order(db, pedido_id)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
        )
    return pedido


# ── Update Order Status ──────────────────────────────────────────────────────


@router.put("/{pedido_id}/estado", response_model=PedidoResponse)
async def update_order_status(
    pedido_id: uuid.UUID,
    data: PedidoUpdateEstado,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update the status of an order."""
    pedido = await service.update_status(db, pedido_id, data.estado)
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
        )
    return pedido


# ── Process Payment ───────────────────────────────────────────────────────────


@router.post("/{pedido_id}/pago", response_model=PagoResponse)
async def process_payment(
    pedido_id: uuid.UUID,
    data: PagoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Simulate payment for an order."""
    return await service.process_payment(db, pedido_id, data)
