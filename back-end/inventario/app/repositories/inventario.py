import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import delete as sa_delete, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Producto


class InventarioRepository:
    """Data-access layer – all DB queries for the Producto entity."""

    async def create(self, db: AsyncSession, producto: Producto) -> Producto:
        db.add(producto)
        await db.flush()
        await db.refresh(producto)
        return producto

    async def get_by_id(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[Producto]:
        result = await db.execute(
            select(Producto).where(Producto.id == product_id)
        )
        return result.scalars().first()

    async def get_by_sku(
        self, db: AsyncSession, sku: str
    ) -> Optional[Producto]:
        result = await db.execute(
            select(Producto).where(Producto.sku == sku)
        )
        return result.scalars().first()

    async def list_all(
        self, db: AsyncSession, filters: dict
    ) -> list[Producto]:
        stmt = select(Producto)

        # ── Search by name or SKU ─────────────────────────────────────
        search: Optional[str] = filters.get("search")
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                Producto.nombre.ilike(pattern) | Producto.sku.ilike(pattern)
            )

        # ── Price range ───────────────────────────────────────────────
        min_price: Optional[Decimal] = filters.get("min_price")
        if min_price is not None:
            stmt = stmt.where(Producto.precio >= min_price)

        max_price: Optional[Decimal] = filters.get("max_price")
        if max_price is not None:
            stmt = stmt.where(Producto.precio <= max_price)

        # ── Pagination ────────────────────────────────────────────────
        offset: int = filters.get("offset", 0)
        limit: int = filters.get("limit", 50)
        stmt = stmt.order_by(Producto.created_at.desc()).offset(offset).limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self, db: AsyncSession, product_id: uuid.UUID, data: dict
    ) -> Optional[Producto]:
        stmt = (
            sa_update(Producto)
            .where(Producto.id == product_id)
            .values(**data)
            .returning(Producto)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
        return row

    async def delete(self, db: AsyncSession, product_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Producto).where(Producto.id == product_id)
        )
        await db.flush()
        return result.rowcount > 0

    async def update_stock(
        self, db: AsyncSession, product_id: uuid.UUID, new_stock: int
    ) -> Optional[Producto]:
        stmt = (
            sa_update(Producto)
            .where(Producto.id == product_id)
            .values(stock=new_stock)
            .returning(Producto)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
        return row
