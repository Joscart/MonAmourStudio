import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import delete as sa_delete, func, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import Descuento, Empaque, Favorito, Garantia, Producto, Resena, Tamano, TipoProducto


class InventarioRepository:
    """Data-access layer – all DB queries for the Producto entity."""

    async def create(self, db: AsyncSession, producto: Producto) -> Producto:
        db.add(producto)
        await db.flush()
        await db.refresh(producto, attribute_names=["tipo_producto", "garantia", "empaque", "descuento", "tamanos"])
        return producto

    async def get_by_id(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[Producto]:
        result = await db.execute(
            select(Producto)
            .options(
                joinedload(Producto.tipo_producto),
                joinedload(Producto.garantia),
                joinedload(Producto.empaque),
                joinedload(Producto.descuento),
                joinedload(Producto.tamanos),
            )
            .where(Producto.id == product_id)
        )
        return result.unique().scalars().first()

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
        stmt = select(Producto).options(
            joinedload(Producto.tipo_producto),
            joinedload(Producto.garantia),
            joinedload(Producto.empaque),
            joinedload(Producto.descuento),
            joinedload(Producto.tamanos),
        )

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
        return list(result.unique().scalars().all())

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
            await db.refresh(row, attribute_names=["tipo_producto", "garantia", "empaque", "descuento", "tamanos"])
        return row

    async def delete(self, db: AsyncSession, product_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Producto).where(Producto.id == product_id)
        )
        await db.flush()
        return result.rowcount > 0

    async def update_disponibilidad(
        self, db: AsyncSession, product_id: uuid.UUID, new_disponibilidad: int
    ) -> Optional[Producto]:
        stmt = (
            sa_update(Producto)
            .where(Producto.id == product_id)
            .values(disponibilidad=new_disponibilidad)
            .returning(Producto)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
        return row


# ── Reseñas ───────────────────────────────────────────────────────────────────


class ResenaRepository:
    """Data-access layer for Resena (reviews)."""

    async def create(self, db: AsyncSession, resena: Resena) -> Resena:
        db.add(resena)
        await db.flush()
        await db.refresh(resena)
        return resena

    async def list_by_producto(
        self, db: AsyncSession, producto_id: uuid.UUID
    ) -> list[Resena]:
        result = await db.execute(
            select(Resena)
            .where(Resena.producto_id == producto_id)
            .order_by(Resena.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_user_and_product(
        self, db: AsyncSession, usuario_id: uuid.UUID, producto_id: uuid.UUID
    ) -> Optional[Resena]:
        result = await db.execute(
            select(Resena).where(
                Resena.usuario_id == usuario_id,
                Resena.producto_id == producto_id,
            )
        )
        return result.scalars().first()

    async def delete(self, db: AsyncSession, resena_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Resena).where(Resena.id == resena_id)
        )
        await db.flush()
        return result.rowcount > 0

    async def calc_average(
        self, db: AsyncSession, producto_id: uuid.UUID
    ) -> tuple[float, int]:
        """Return (average_rating, total_reviews) for a product."""
        result = await db.execute(
            select(
                func.coalesce(func.avg(Resena.calificacion), 0),
                func.count(Resena.id),
            ).where(Resena.producto_id == producto_id)
        )
        row = result.one()
        return float(row[0]), int(row[1])


# ── Tipos de producto ─────────────────────────────────────────────────────────


class TipoProductoRepository:
    """Data-access layer for TipoProducto."""

    async def create(self, db: AsyncSession, tipo: TipoProducto) -> TipoProducto:
        db.add(tipo)
        await db.flush()
        await db.refresh(tipo)
        return tipo

    async def list_all(self, db: AsyncSession) -> list[TipoProducto]:
        result = await db.execute(
            select(TipoProducto).order_by(TipoProducto.nombre)
        )
        return list(result.scalars().all())

    async def get_by_name(
        self, db: AsyncSession, nombre: str
    ) -> Optional[TipoProducto]:
        result = await db.execute(
            select(TipoProducto).where(TipoProducto.nombre == nombre)
        )
        return result.scalars().first()

    async def delete(self, db: AsyncSession, tipo_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(TipoProducto).where(TipoProducto.id == tipo_id)
        )
        await db.flush()
        return result.rowcount > 0


# ── Tamaño ─────────────────────────────────────────────────────────────────


class TamanoRepository:
    async def create(self, db: AsyncSession, tamano: Tamano) -> Tamano:
        db.add(tamano)
        await db.flush()
        await db.refresh(tamano)
        return tamano

    async def list_by_producto(
        self, db: AsyncSession, producto_id: uuid.UUID
    ) -> list[Tamano]:
        result = await db.execute(
            select(Tamano)
            .where(Tamano.producto_id == producto_id)
            .order_by(Tamano.precio_adicional)
        )
        return list(result.scalars().all())

    async def delete(self, db: AsyncSession, tamano_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Tamano).where(Tamano.id == tamano_id)
        )
        await db.flush()
        return result.rowcount > 0


# ── Garantía ───────────────────────────────────────────────────────────────


class GarantiaRepository:
    async def create(self, db: AsyncSession, garantia: Garantia) -> Garantia:
        db.add(garantia)
        await db.flush()
        await db.refresh(garantia)
        return garantia

    async def list_all(self, db: AsyncSession) -> list[Garantia]:
        result = await db.execute(select(Garantia).order_by(Garantia.dias))
        return list(result.scalars().all())

    async def get_by_name(
        self, db: AsyncSession, nombre: str
    ) -> Optional[Garantia]:
        result = await db.execute(
            select(Garantia).where(Garantia.nombre == nombre)
        )
        return result.scalars().first()

    async def delete(self, db: AsyncSession, garantia_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Garantia).where(Garantia.id == garantia_id)
        )
        await db.flush()
        return result.rowcount > 0


# ── Empaque ────────────────────────────────────────────────────────────────


class EmpaqueRepository:
    async def create(self, db: AsyncSession, empaque: Empaque) -> Empaque:
        db.add(empaque)
        await db.flush()
        await db.refresh(empaque)
        return empaque

    async def list_all(self, db: AsyncSession) -> list[Empaque]:
        result = await db.execute(select(Empaque).order_by(Empaque.nombre))
        return list(result.scalars().all())

    async def get_by_name(
        self, db: AsyncSession, nombre: str
    ) -> Optional[Empaque]:
        result = await db.execute(
            select(Empaque).where(Empaque.nombre == nombre)
        )
        return result.scalars().first()

    async def delete(self, db: AsyncSession, empaque_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Empaque).where(Empaque.id == empaque_id)
        )
        await db.flush()
        return result.rowcount > 0


# ── Descuento ──────────────────────────────────────────────────────────────


class DescuentoRepository:
    async def create(self, db: AsyncSession, descuento: Descuento) -> Descuento:
        db.add(descuento)
        await db.flush()
        await db.refresh(descuento)
        return descuento

    async def list_all(self, db: AsyncSession) -> list[Descuento]:
        result = await db.execute(
            select(Descuento).order_by(Descuento.porcentaje)
        )
        return list(result.scalars().all())

    async def get_by_name(
        self, db: AsyncSession, nombre: str
    ) -> Optional[Descuento]:
        result = await db.execute(
            select(Descuento).where(Descuento.nombre == nombre)
        )
        return result.scalars().first()

    async def delete(self, db: AsyncSession, descuento_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Descuento).where(Descuento.id == descuento_id)
        )
        await db.flush()
        return result.rowcount > 0


# ── Favoritos ──────────────────────────────────────────────────────────────────


class FavoritoRepository:
    async def create(self, db: AsyncSession, favorito: Favorito) -> Favorito:
        db.add(favorito)
        await db.flush()
        await db.refresh(favorito)
        return favorito

    async def list_by_user(
        self, db: AsyncSession, usuario_id: uuid.UUID
    ) -> list[Favorito]:
        result = await db.execute(
            select(Favorito)
            .options(joinedload(Favorito.producto))
            .where(Favorito.usuario_id == usuario_id)
            .order_by(Favorito.created_at.desc())
        )
        return list(result.unique().scalars().all())

    async def get_by_user_and_product(
        self, db: AsyncSession, usuario_id: uuid.UUID, producto_id: uuid.UUID
    ) -> Optional[Favorito]:
        result = await db.execute(
            select(Favorito).where(
                Favorito.usuario_id == usuario_id,
                Favorito.producto_id == producto_id,
            )
        )
        return result.scalars().first()

    async def delete(self, db: AsyncSession, favorito_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Favorito).where(Favorito.id == favorito_id)
        )
        await db.flush()
        return result.rowcount > 0

    async def delete_by_user_and_product(
        self, db: AsyncSession, usuario_id: uuid.UUID, producto_id: uuid.UUID
    ) -> bool:
        result = await db.execute(
            sa_delete(Favorito).where(
                Favorito.usuario_id == usuario_id,
                Favorito.producto_id == producto_id,
            )
        )
        await db.flush()
        return result.rowcount > 0

    async def list_product_ids_for_user(
        self, db: AsyncSession, usuario_id: uuid.UUID
    ) -> list[uuid.UUID]:
        result = await db.execute(
            select(Favorito.producto_id).where(Favorito.usuario_id == usuario_id)
        )
        return list(result.scalars().all())
