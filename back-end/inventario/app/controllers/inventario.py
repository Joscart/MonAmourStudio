import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    ProductoCreate,
    ProductoResponse,
    ProductoUpdate,
    ReserveStockRequest,
    ReserveStockResponse,
)
from app.services.inventario import InventarioService

router = APIRouter(prefix="/productos", tags=["productos"])
service = InventarioService()


# ── List Products ─────────────────────────────────────────────────────────────


@router.get("/", response_model=List[ProductoResponse])
async def list_products(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List products with optional filters."""
    filters = {
        "search": search,
        "min_price": min_price,
        "max_price": max_price,
        "offset": offset,
        "limit": limit,
    }
    return await service.list_products(db, filters)


# ── Get Product Detail ────────────────────────────────────────────────────────


@router.get("/{product_id}", response_model=ProductoResponse)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single product by its ID."""
    product = await service.get_product(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    return product


# ── Create Product ────────────────────────────────────────────────────────────


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductoCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new product."""
    return await service.create_product(db, data)


# ── Update Product ────────────────────────────────────────────────────────────


@router.put("/{product_id}", response_model=ProductoResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductoUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing product."""
    product = await service.update_product(db, product_id, data)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    return product


# ── Delete Product ────────────────────────────────────────────────────────────


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a product by its ID."""
    deleted = await service.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )


# ── Reserve Stock ─────────────────────────────────────────────────────────────


@router.post("/{product_id}/reserve", response_model=ReserveStockResponse)
async def reserve_stock(
    product_id: uuid.UUID,
    data: ReserveStockRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reserve stock for a product (reduces available stock)."""
    return await service.reserve_stock(db, product_id, data.cantidad, data.pedido_id)


# ── Release Stock ─────────────────────────────────────────────────────────────


@router.post("/{product_id}/release", response_model=ReserveStockResponse)
async def release_stock(
    product_id: uuid.UUID,
    data: ReserveStockRequest,
    db: AsyncSession = Depends(get_db),
):
    """Release previously reserved stock (increases available stock)."""
    return await service.release_stock(db, product_id, data.cantidad, data.pedido_id)
