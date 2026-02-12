import json
import logging
from typing import Any, Callable, Coroutine, Optional, Set

from aiokafka import AIOKafkaConsumer

from app.config import settings

logger = logging.getLogger(__name__)

Handler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class KafkaEventConsumer:
    """Async Kafka consumer with in-memory idempotency tracking."""

    def __init__(self, group_id: str = "orchestrator-group") -> None:
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
        if self._consumer is None:
            logger.warning("Kafka consumer not available – cannot consume")
            return

        try:
            async for msg in self._consumer:
                payload: dict[str, Any] = msg.value
                event_id: Optional[str] = payload.get("event_id")

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
