import logging
import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Pedido, PedidoItem
from app.repositories.pedidos import PedidoRepository
from app.schemas import PagoRequest, PagoResponse, PedidoCreate

logger = logging.getLogger(__name__)

# Flat shipping rate (can be made configurable)
SHIPPING_RATE = Decimal("5.00")


class PedidoService:
    """Business-logic layer for order management."""

    def __init__(self) -> None:
        self.repo = PedidoRepository()

    # ── Create Order ──────────────────────────────────────────────────

    async def create_order(
        self, db: AsyncSession, data: PedidoCreate
    ) -> Pedido:
        # Calculate subtotal from items
        subtotal = Decimal("0.00")
        for item in data.items:
            subtotal += Decimal(str(item.precio_unitario)) * item.cantidad

        shipping = SHIPPING_RATE
        total = subtotal + shipping

        # Build the Pedido model
        pedido = Pedido(
            usuario_id=data.usuario_id,
            estado="pendiente",
            subtotal=subtotal,
            shipping=shipping,
            total=total,
            direccion_entrega=data.direccion_entrega,
            coordenadas_entrega=data.coordenadas_entrega,
        )

        # Build PedidoItem models
        items = [
            PedidoItem(
                producto_id=item.producto_id,
                variante=item.variante,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
            )
            for item in data.items
        ]

        pedido = await self.repo.create(db, pedido, items)

        # Publish order.created event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                event_id = str(uuid.uuid4())
                await kafka_producer.publish(
                    topic="order.created",
                    key=str(pedido.id),
                    value={
                        "event": "order.created",
                        "event_id": event_id,
                        "pedido_id": str(pedido.id),
                        "usuario_id": str(pedido.usuario_id),
                        "total": str(pedido.total),
                        "items": [
                            {
                                "producto_id": str(i.producto_id),
                                "variante": i.variante,
                                "cantidad": i.cantidad,
                                "precio_unitario": str(i.precio_unitario),
                            }
                            for i in pedido.items
                        ],
                    },
                )
                # Record event for idempotency
                await self.repo.record_event(
                    db,
                    pedido_id=pedido.id,
                    event_id=event_id,
                    evento="order.created",
                    payload={"pedido_id": str(pedido.id)},
                )
        except Exception as exc:
            logger.warning("Failed to publish order.created event: %s", exc)

        return pedido

    # ── Get Order ─────────────────────────────────────────────────────

    async def get_order(
        self, db: AsyncSession, pedido_id: uuid.UUID
    ) -> Optional[Pedido]:
        return await self.repo.get_by_id(db, pedido_id)

    # ── List Orders ───────────────────────────────────────────────────

    async def list_orders(
        self,
        db: AsyncSession,
        usuario_id: Optional[uuid.UUID] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Pedido]:
        return await self.repo.list_by_user(
            db, usuario_id=usuario_id, offset=offset, limit=limit
        )

    # ── Update Status ─────────────────────────────────────────────────

    async def update_status(
        self, db: AsyncSession, pedido_id: uuid.UUID, new_status: str
    ) -> Optional[Pedido]:
        pedido = await self.repo.get_by_id(db, pedido_id)
        if pedido is None:
            return None
        return await self.repo.update_status(db, pedido_id, new_status)

    # ── Process Payment ───────────────────────────────────────────────

    async def process_payment(
        self, db: AsyncSession, pedido_id: uuid.UUID, pago_data: PagoRequest
    ) -> PagoResponse:
        pedido = await self.repo.get_by_id(db, pedido_id)
        if pedido is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )

        if pedido.estado == "pagado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El pedido ya fue pagado",
            )

        # Validate amount matches order total
        if Decimal(str(pago_data.monto)) != Decimal(str(pedido.total)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Monto incorrecto. Total del pedido: {pedido.total}",
            )

        # Simulate payment processing (always succeeds)
        transaction_id = str(uuid.uuid4())

        # Update order status to "pagado"
        await self.repo.update_status(db, pedido_id, "pagado")

        # Publish payment.succeeded event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                event_id = str(uuid.uuid4())
                await kafka_producer.publish(
                    topic="payment.succeeded",
                    key=str(pedido_id),
                    value={
                        "event": "payment.succeeded",
                        "event_id": event_id,
                        "pedido_id": str(pedido_id),
                        "usuario_id": str(pedido.usuario_id),
                        "monto": str(pago_data.monto),
                        "metodo_pago": pago_data.metodo_pago,
                        "transaction_id": transaction_id,
                    },
                )
                # Record event for idempotency
                await self.repo.record_event(
                    db,
                    pedido_id=pedido_id,
                    event_id=event_id,
                    evento="payment.succeeded",
                    payload={
                        "pedido_id": str(pedido_id),
                        "transaction_id": transaction_id,
                    },
                )
        except Exception as exc:
            logger.warning("Failed to publish payment.succeeded event: %s", exc)

        return PagoResponse(
            success=True,
            message="Pago procesado exitosamente",
            transaction_id=transaction_id,
        )
