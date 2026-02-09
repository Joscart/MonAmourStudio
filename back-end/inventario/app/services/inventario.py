import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Descuento, Empaque, Favorito, Garantia, Producto, Resena, Tamano, TipoProducto
from app.repositories.inventario import (
    DescuentoRepository,
    EmpaqueRepository,
    FavoritoRepository,
    GarantiaRepository,
    InventarioRepository,
    ResenaRepository,
    TamanoRepository,
    TipoProductoRepository,
)
from app.schemas import (
    DescuentoCreate,
    EmpaqueCreate,
    FavoritoResponse,
    GarantiaCreate,
    ProductoCreate,
    ProductoResponse,
    ProductoUpdate,
    ResenaCreate,
    ResenaResponse,
    ReserveStockResponse,
    TamanoCreate,
    TamanoResponse,
    TipoProductoCreate,
)

logger = logging.getLogger(__name__)


def _product_to_response(p: Producto) -> ProductoResponse:
    """Convert ORM Producto to response, adding resolved names."""
    data = ProductoResponse.model_validate(p)
    if p.tipo_producto is not None:
        data.tipo_producto_nombre = p.tipo_producto.nombre
    if p.garantia is not None:
        data.garantia_nombre = p.garantia.nombre
        data.garantia_dias = p.garantia.dias
    if p.empaque is not None:
        data.empaque_nombre = p.empaque.nombre
    if p.descuento is not None:
        data.descuento_nombre = p.descuento.nombre
        data.descuento_porcentaje = p.descuento.porcentaje
    return data


class InventarioService:
    """Business-logic layer for inventory / product management."""

    def __init__(self) -> None:
        self.repo = InventarioRepository()
        self.resena_repo = ResenaRepository()
        self.tipo_repo = TipoProductoRepository()
        self.garantia_repo = GarantiaRepository()
        self.empaque_repo = EmpaqueRepository()
        self.descuento_repo = DescuentoRepository()
        self.tamano_repo = TamanoRepository()
        self.favorito_repo = FavoritoRepository()

    # ── List ──────────────────────────────────────────────────────────

    async def list_products(
        self, db: AsyncSession, filters: dict
    ) -> list[ProductoResponse]:
        items = await self.repo.list_all(db, filters)
        return [_product_to_response(p) for p in items]

    # ── Get ───────────────────────────────────────────────────────────

    async def get_product(
        self, db: AsyncSession, product_id: uuid.UUID
    ) -> Optional[ProductoResponse]:
        p = await self.repo.get_by_id(db, product_id)
        if p is None:
            return None
        return _product_to_response(p)

    # ── Create ────────────────────────────────────────────────────────

    async def create_product(
        self, db: AsyncSession, data: ProductoCreate
    ) -> ProductoResponse:
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
            disponibilidad=data.disponibilidad,
            max_por_pedido=data.max_por_pedido,
            imagen_url=data.imagen_url,
            envio_gratis_umbral=data.envio_gratis_umbral,
            tipo_producto_id=data.tipo_producto_id,
            garantia_id=data.garantia_id,
            empaque_id=data.empaque_id,
            descuento_id=data.descuento_id,
            imagen_preview_url=data.imagen_preview_url,
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
                        "disponibilidad": producto.disponibilidad,
                        "max_por_pedido": producto.max_por_pedido,
                    },
                )
        except Exception:
            pass

        return _product_to_response(producto)

    # ── Update ────────────────────────────────────────────────────────

    async def update_product(
        self, db: AsyncSession, product_id: uuid.UUID, data: ProductoUpdate
    ) -> Optional[ProductoResponse]:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_product(db, product_id)
        p = await self.repo.update(db, product_id, update_data)
        if p is None:
            return None
        return _product_to_response(p)

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

        # Validate max_por_pedido limit
        if cantidad > producto.max_por_pedido:
            return ReserveStockResponse(
                success=False,
                message=(
                    f"Cantidad excede el maximo por pedido. "
                    f"Maximo permitido: {producto.max_por_pedido}, solicitado: {cantidad}"
                ),
            )

        if producto.disponibilidad < cantidad:
            return ReserveStockResponse(
                success=False,
                message=(
                    f"Disponibilidad insuficiente. "
                    f"Disponible: {producto.disponibilidad}, solicitado: {cantidad}"
                ),
            )

        new_disponibilidad = producto.disponibilidad - cantidad
        await self.repo.update_disponibilidad(db, product_id, new_disponibilidad)

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
                        "disponibilidad_restante": new_disponibilidad,
                    },
                )
        except Exception as exc:
            logger.error("Failed to publish stock.reserved event: %s", exc)

        return ReserveStockResponse(
            success=True,
            message=f"Stock reservado: {cantidad} unidades. Disponibilidad restante: {new_disponibilidad}",
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

        new_disponibilidad = producto.disponibilidad + cantidad
        await self.repo.update_disponibilidad(db, product_id, new_disponibilidad)

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
                        "disponibilidad_restante": new_disponibilidad,
                    },
                )
        except Exception as exc:
            logger.error("Failed to publish stock.released event: %s", exc)

        return ReserveStockResponse(
            success=True,
            message=f"Stock liberado: {cantidad} unidades. Disponibilidad actual: {new_disponibilidad}",
        )

    # ══════════════════════════════════════════════════════════════════
    #  Reseñas (Reviews)
    # ══════════════════════════════════════════════════════════════════

    async def create_resena(
        self,
        db: AsyncSession,
        producto_id: uuid.UUID,
        usuario_id: uuid.UUID,
        usuario_nombre: str,
        data: ResenaCreate,
    ) -> ResenaResponse:
        # Check product exists
        producto = await self.repo.get_by_id(db, producto_id)
        if producto is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )

        # Check user hasn't already reviewed
        existing = await self.resena_repo.get_by_user_and_product(
            db, usuario_id, producto_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya dejaste una resena para este producto",
            )

        resena = Resena(
            producto_id=producto_id,
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
            calificacion=data.calificacion,
            comentario=data.comentario,
        )
        resena = await self.resena_repo.create(db, resena)

        # Update denormalized rating
        avg, total = await self.resena_repo.calc_average(db, producto_id)
        await self.repo.update(
            db,
            producto_id,
            {"calificacion_promedio": round(avg, 2), "total_resenas": total},
        )

        return ResenaResponse.model_validate(resena)

    async def list_resenas(
        self, db: AsyncSession, producto_id: uuid.UUID
    ) -> list[ResenaResponse]:
        items = await self.resena_repo.list_by_producto(db, producto_id)
        return [ResenaResponse.model_validate(r) for r in items]

    async def delete_resena(
        self,
        db: AsyncSession,
        resena_id: uuid.UUID,
        producto_id: uuid.UUID,
    ) -> bool:
        deleted = await self.resena_repo.delete(db, resena_id)
        if deleted:
            avg, total = await self.resena_repo.calc_average(db, producto_id)
            await self.repo.update(
                db,
                producto_id,
                {"calificacion_promedio": round(avg, 2), "total_resenas": total},
            )
        return deleted

    # ══════════════════════════════════════════════════════════════════
    #  Tipos de producto
    # ══════════════════════════════════════════════════════════════════

    async def list_tipos(self, db: AsyncSession) -> list[TipoProducto]:
        return await self.tipo_repo.list_all(db)

    async def create_tipo(
        self, db: AsyncSession, data: TipoProductoCreate
    ) -> TipoProducto:
        existing = await self.tipo_repo.get_by_name(db, data.nombre)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un tipo de producto '{data.nombre}'",
            )
        tipo = TipoProducto(nombre=data.nombre)
        return await self.tipo_repo.create(db, tipo)

    async def delete_tipo(self, db: AsyncSession, tipo_id: uuid.UUID) -> bool:
        return await self.tipo_repo.delete(db, tipo_id)

    # ════════════════════════════════════════════════════════════════
    #  Garantías
    # ════════════════════════════════════════════════════════════════

    async def list_garantias(self, db: AsyncSession) -> list[Garantia]:
        return await self.garantia_repo.list_all(db)

    async def create_garantia(self, db: AsyncSession, data: GarantiaCreate) -> Garantia:
        existing = await self.garantia_repo.get_by_name(db, data.nombre)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe una garantia '{data.nombre}'")
        return await self.garantia_repo.create(db, Garantia(nombre=data.nombre, dias=data.dias))

    async def delete_garantia(self, db: AsyncSession, garantia_id: uuid.UUID) -> bool:
        return await self.garantia_repo.delete(db, garantia_id)

    # ════════════════════════════════════════════════════════════════
    #  Empaques
    # ════════════════════════════════════════════════════════════════

    async def list_empaques(self, db: AsyncSession) -> list[Empaque]:
        return await self.empaque_repo.list_all(db)

    async def create_empaque(self, db: AsyncSession, data: EmpaqueCreate) -> Empaque:
        existing = await self.empaque_repo.get_by_name(db, data.nombre)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe un empaque '{data.nombre}'")
        return await self.empaque_repo.create(db, Empaque(nombre=data.nombre))

    async def delete_empaque(self, db: AsyncSession, empaque_id: uuid.UUID) -> bool:
        return await self.empaque_repo.delete(db, empaque_id)

    # ════════════════════════════════════════════════════════════════
    #  Descuentos
    # ════════════════════════════════════════════════════════════════

    async def list_descuentos(self, db: AsyncSession) -> list[Descuento]:
        return await self.descuento_repo.list_all(db)

    async def create_descuento(self, db: AsyncSession, data: DescuentoCreate) -> Descuento:
        existing = await self.descuento_repo.get_by_name(db, data.nombre)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe un descuento '{data.nombre}'")
        return await self.descuento_repo.create(db, Descuento(nombre=data.nombre, porcentaje=data.porcentaje))

    async def delete_descuento(self, db: AsyncSession, descuento_id: uuid.UUID) -> bool:
        return await self.descuento_repo.delete(db, descuento_id)

    # ════════════════════════════════════════════════════════════════
    #  Tamaños (per-product size variants)
    # ════════════════════════════════════════════════════════════════

    async def add_tamano(
        self, db: AsyncSession, producto_id: uuid.UUID, data: TamanoCreate
    ) -> TamanoResponse:
        producto = await self.repo.get_by_id(db, producto_id)
        if producto is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
        tamano = Tamano(
            producto_id=producto_id,
            nombre=data.nombre,
            ancho_cm=data.ancho_cm,
            alto_cm=data.alto_cm,
            precio_adicional=data.precio_adicional,
        )
        tamano = await self.tamano_repo.create(db, tamano)
        return TamanoResponse.model_validate(tamano)

    async def list_tamanos(
        self, db: AsyncSession, producto_id: uuid.UUID
    ) -> list[TamanoResponse]:
        items = await self.tamano_repo.list_by_producto(db, producto_id)
        return [TamanoResponse.model_validate(t) for t in items]

    async def delete_tamano(self, db: AsyncSession, tamano_id: uuid.UUID) -> bool:
        return await self.tamano_repo.delete(db, tamano_id)

    # ════════════════════════════════════════════════════════════════
    #  Favoritos
    # ════════════════════════════════════════════════════════════════

    async def toggle_favorito(
        self, db: AsyncSession, usuario_id: uuid.UUID, producto_id: uuid.UUID
    ) -> dict:
        """Toggle favorite: add if not present, remove if present. Returns {favorited: bool}."""
        existing = await self.favorito_repo.get_by_user_and_product(db, usuario_id, producto_id)
        if existing:
            await self.favorito_repo.delete(db, existing.id)
            return {"favorited": False}
        fav = Favorito(usuario_id=usuario_id, producto_id=producto_id)
        await self.favorito_repo.create(db, fav)
        return {"favorited": True}

    async def list_favoritos(
        self, db: AsyncSession, usuario_id: uuid.UUID
    ) -> list[FavoritoResponse]:
        items = await self.favorito_repo.list_by_user(db, usuario_id)
        return [FavoritoResponse.model_validate(f) for f in items]

    async def list_favorito_ids(
        self, db: AsyncSession, usuario_id: uuid.UUID
    ) -> list[uuid.UUID]:
        return await self.favorito_repo.list_product_ids_for_user(db, usuario_id)
