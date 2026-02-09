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

    def __init__(self, group_id: str = "inventario-group") -> None:
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
        Skips events whose ``event_id`` has already been processed.
        """
        if self._consumer is None:
            logger.warning("Kafka consumer not available – cannot consume")
            return

        try:
            async for msg in self._consumer:
                payload: dict[str, Any] = msg.value
                event_id: Optional[str] = payload.get("event_id")

                # Idempotency: skip already-processed events
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


async def handle_order_created(payload: dict[str, Any]) -> None:
    """
    Handle 'order.created' events by reserving stock for each item in the order.
    Expected payload:
        {
            "event": "order.created",
            "event_id": "...",
            "pedido_id": "...",
            "items": [
                {"producto_id": "...", "cantidad": 2},
                ...
            ]
        }
    """
    from app.database import async_session
    from app.services.inventario import InventarioService

    pedido_id_str: Optional[str] = payload.get("pedido_id")
    items: list[dict] = payload.get("items", [])

    if not pedido_id_str or not items:
        logger.warning("Invalid order.created payload: %s", payload)
        return

    pedido_id = uuid.UUID(pedido_id_str)
    svc = InventarioService()

    async with async_session() as db:
        try:
            for item in items:
                producto_id = uuid.UUID(item["producto_id"])
                cantidad = int(item["cantidad"])
                result = await svc.reserve_stock(db, producto_id, cantidad, pedido_id)
                if result.success:
                    logger.info(
                        "Reserved %d of product %s for order %s",
                        cantidad,
                        producto_id,
                        pedido_id,
                    )
                else:
                    logger.warning(
                        "Could not reserve stock for product %s: %s",
                        producto_id,
                        result.message,
                    )
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error("Error processing order.created: %s", exc)
