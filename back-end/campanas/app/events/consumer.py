import json
import logging
from typing import Any, Callable, Coroutine, Optional, Set

from aiokafka import AIOKafkaConsumer

from app.config import settings

logger = logging.getLogger(__name__)

Handler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class KafkaEventConsumer:
    """Async Kafka consumer with idempotency tracking."""

    def __init__(self, group_id: str = "campanas-group") -> None:
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
        (in-memory idempotency check).
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


# ── Event Handlers ────────────────────────────────────────────────────────────


async def handle_order_created(payload: dict[str, Any]) -> None:
    """
    Handle 'order.created' events.
    Track campaign effectiveness by correlating orders with active campaigns.
    This allows measuring conversion rates and campaign ROI.
    """
    logger.info(
        "Received order.created event: order_id=%s, total=%s",
        payload.get("pedido_id", "unknown"),
        payload.get("total", "N/A"),
    )

    # Extract relevant data for analytics
    pedido_id = payload.get("pedido_id")
    usuario_id = payload.get("usuario_id")
    total = payload.get("total")
    campana_ref = payload.get("campana_id")  # optional campaign attribution

    if campana_ref:
        logger.info(
            "Order %s attributed to campaign %s (user=%s, total=%s)",
            pedido_id,
            campana_ref,
            usuario_id,
            total,
        )
    else:
        logger.debug(
            "Order %s has no campaign attribution (user=%s)",
            pedido_id,
            usuario_id,
        )


async def handle_payment_succeeded(payload: dict[str, Any]) -> None:
    """
    Handle 'payment.succeeded' events.
    Track successful payments to measure campaign-driven revenue.
    """
    logger.info(
        "Received payment.succeeded event: pedido_id=%s, monto=%s",
        payload.get("pedido_id", "unknown"),
        payload.get("monto", "N/A"),
    )
