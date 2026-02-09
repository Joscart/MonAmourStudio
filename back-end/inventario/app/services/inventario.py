import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Producto
from app.repositories.inventario import InventarioRepository
from app.schemas import (
    ProductoCreate,
    ProductoUpdate,
    ReserveStockResponse,
)

logger = logging.getLogger(__name__)


class InventarioService:
    """Business-logic layer for inventory / product management."""

    def __init__(self) -> None:
        self.repo = InventarioRepository()

    # ── List ──────────────────────────────────────────────────────────

    async def list_products(
        self, db: AsyncSession, filters: dict
    ) -> list[Producto]:
        return await self.repo.list_all(db, filters)

    # ── Get ───────────────────────────────────────────────────────────

    async def get_product(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[Producto]:
        return await self.repo.get_by_id(db, product_id)

    # ── Create ────────────────────────────────────────────────────────

    async def create_product(
        self, db: AsyncSession, data: ProductoCreate
    ) -> Producto:
        existing = await self.repo.get_by_sku(db, data.sku)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un producto con SKU '{data.sku}'",
            )

        producto = Producto(
            sku=data.sku,
            nombre=data.nombre,
            descripcion=data.descripcion,
            precio=data.precio,
            moneda=data.moneda,
            stock=data.stock,
            imagen_url=data.imagen_url,
        )
        producto = await self.repo.create(db, producto)

        # Publish domain event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="inventory",
                    key=str(producto.id),
                    value={
                        "event": "product.created",
                        "product_id": str(producto.id),
                        "sku": producto.sku,
                        "nombre": producto.nombre,
                        "stock": producto.stock,
                    },
                )
        except Exception:
            pass

        return producto

    # ── Update ────────────────────────────────────────────────────────

    async def update_product(
        self, db: AsyncSession, product_id: uuid.UUID, data: ProductoUpdate
    ) -> Optional[Producto]:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.repo.get_by_id(db, product_id)
        return await self.repo.update(db, product_id, update_data)

    # ── Delete ────────────────────────────────────────────────────────

    async def delete_product(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> bool:
        return await self.repo.delete(db, product_id)

    # ── Reserve Stock ─────────────────────────────────────────────────

    async def reserve_stock(
        self,
        db: AsyncSession,
        product_id: uuid.UUID,
        cantidad: int,
        pedido_id: uuid.UUID,
    ) -> ReserveStockResponse:
        producto = await self.repo.get_by_id(db, product_id)
        if producto is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )

        if producto.stock < cantidad:
            return ReserveStockResponse(
                success=False,
                message=f"Stock insuficiente. Disponible: {producto.stock}, solicitado: {cantidad}",
            )

        new_stock = producto.stock - cantidad
        await self.repo.update_stock(db, product_id, new_stock)

        # Publish stock.reserved event
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="inventory",
                    key=str(product_id),
                    value={
                        "event": "stock.reserved",
                        "product_id": str(product_id),
                        "pedido_id": str(pedido_id),
                        "cantidad": cantidad,
                        "stock_restante": new_stock,
                    },
                )
        except Exception as exc:
            logger.error("Failed to publish stock.reserved event: %s", exc)

        return ReserveStockResponse(
            success=True,
            message=f"Stock reservado: {cantidad} unidades. Stock restante: {new_stock}",
        )

    # ── Release Stock ─────────────────────────────────────────────────

    async def release_stock(
        self,
        db: AsyncSession,
        product_id: uuid.UUID,
        cantidad: int,
        pedido_id: uuid.UUID,
    ) -> ReserveStockResponse:
        producto = await self.repo.get_by_id(db, product_id)
        if producto is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )

        new_stock = producto.stock + cantidad
        await self.repo.update_stock(db, product_id, new_stock)

        # Publish stock.released event
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="inventory",
                    key=str(product_id),
                    value={
                        "event": "stock.released",
                        "product_id": str(product_id),
                        "pedido_id": str(pedido_id),
                        "cantidad": cantidad,
                        "stock_restante": new_stock,
                    },
                )
        except Exception as exc:
            logger.error("Failed to publish stock.released event: %s", exc)

        return ReserveStockResponse(
            success=True,
            message=f"Stock liberado: {cantidad} unidades. Stock actual: {new_stock}",
        )
