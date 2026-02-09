import json
import logging
import uuid
from typing import Any, Callable, Coroutine, Optional, Set

from aiokafka import AIOKafkaConsumer

from app.config import settings

logger = logging.getLogger(__name__)

Handler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class KafkaEventConsumer:
    """Async Kafka consumer with idempotency tracking."""

    def __init__(self, group_id: str = "pedidos-group") -> None:
        self._consumer: Optional[AIOKafkaConsumer] = None
        self._group_id = group_id
        self._processed_ids: Set[str] = set()

    async def start(self, topics: list[str]) -> None:
        self._consumer = AIOKafkaConsumer(
            *topics,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=self._group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )
        try:
            await self._consumer.start()
            logger.info("Kafka consumer started for topics %s", topics)
        except Exception as exc:
            logger.warning("Could not start Kafka consumer: %s", exc)
            self._consumer = None

    async def stop(self) -> None:
        if self._consumer is not None:
            await self._consumer.stop()
            logger.info("Kafka consumer stopped")
            self._consumer = None

    async def consume(self, handler: Handler) -> None:
        """
        Continuously consume messages and delegate to *handler*.
        Skips events whose ``event_id`` has already been processed
        (checked against both in-memory set and pedido_eventos table).
        """
        if self._consumer is None:
            logger.warning("Kafka consumer not available – cannot consume")
            return

        try:
            async for msg in self._consumer:
                payload: dict[str, Any] = msg.value
                event_id: Optional[str] = payload.get("event_id")

                # In-memory idempotency: skip already-processed events
                if event_id and event_id in self._processed_ids:
                    logger.debug("Skipping duplicate event %s", event_id)
                    continue

                try:
                    await handler(payload)
                    if event_id:
                        self._processed_ids.add(event_id)
                except Exception as exc:
                    logger.error("Error handling event: %s", exc)
        except Exception as exc:
            logger.error("Consumer loop error: %s", exc)


async def handle_stock_reserved(payload: dict[str, Any]) -> None:
    """
    Handle 'stock.reserved' events.
    When stock is successfully reserved for an order, update the order status
    to indicate stock has been confirmed.

    Expected payload:
        {
            "event": "stock.reserved",
            "event_id": "...",
            "pedido_id": "...",
            "producto_id": "...",
            "cantidad": 2,
            "success": true
        }
    """
    from app.database import async_session
    from app.repositories.pedidos import PedidoRepository

    event_id: Optional[str] = payload.get("event_id")
    pedido_id_str: Optional[str] = payload.get("pedido_id")
    success: bool = payload.get("success", False)

    if not pedido_id_str:
        logger.warning("Invalid stock.reserved payload: %s", payload)
        return

    pedido_id = uuid.UUID(pedido_id_str)
    repo = PedidoRepository()

    async with async_session() as db:
        try:
            # DB-level idempotency check
            if event_id and await repo.event_exists(db, event_id):
                logger.debug("Event %s already processed (DB), skipping", event_id)
                return

            if success:
                await repo.update_status(db, pedido_id, "stock_reservado")
                logger.info(
                    "Order %s status updated to stock_reservado", pedido_id
                )
            else:
                await repo.update_status(db, pedido_id, "sin_stock")
                logger.warning(
                    "Order %s status updated to sin_stock (reservation failed)",
                    pedido_id,
                )

            # Record event for idempotency
            if event_id:
                await repo.record_event(
                    db,
                    pedido_id=pedido_id,
                    event_id=event_id,
                    evento="stock.reserved",
                    payload=payload,
                )

            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error("Error handling stock.reserved for order %s: %s", pedido_id, exc)
