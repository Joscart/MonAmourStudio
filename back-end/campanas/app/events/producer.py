import json
import logging
from typing import Any, Optional

from aiokafka import AIOKafkaProducer

from app.config import settings

logger = logging.getLogger(__name__)


class KafkaEventProducer:
    """Async Kafka producer that serialises values to JSON."""

    def __init__(self) -> None:
        self._producer: Optional[AIOKafkaProducer] = None

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
        try:
            await self._producer.start()
            logger.info("Kafka producer started")
        except Exception as exc:
            logger.warning("Could not start Kafka producer: %s", exc)
            self._producer = None

    async def stop(self) -> None:
        if self._producer is not None:
            await self._producer.stop()
            logger.info("Kafka producer stopped")
            self._producer = None

    async def publish(self, topic: str, key: str, value: Any) -> None:
        if self._producer is None:
            logger.warning("Kafka producer not available – event dropped")
            return
        try:
            await self._producer.send_and_wait(topic=topic, key=key, value=value)
            logger.info("Published event to %s [key=%s]", topic, key)
        except Exception as exc:
            logger.error("Failed to publish event: %s", exc)


# Module-level singleton used across the app
kafka_producer: Optional[KafkaEventProducer] = None
