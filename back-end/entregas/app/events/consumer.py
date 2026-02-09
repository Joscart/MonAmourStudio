import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Coroutine, Optional, Set

from aiokafka import AIOKafkaConsumer

from app.config import settings

logger = logging.getLogger(__name__)

Handler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class KafkaEventConsumer:
    """Async Kafka consumer with idempotency tracking."""

    def __init__(self, group_id: str = "entregas-group") -> None:
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
        (checked against both in-memory set and entrega_eventos table).
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


async def handle_payment_succeeded(payload: dict[str, Any]) -> None:
    """
    Handle 'payment.succeeded' events.
    When a payment is confirmed, automatically schedule a delivery for the order.

    Expected payload:
        {
            "event": "payment.succeeded",
            "event_id": "...",
            "pedido_id": "...",
            "direccion_entrega": "...",
            ...
        }
    """
    from app.database import async_session
    from app.repositories.entregas import EntregaRepository

    event_id: Optional[str] = payload.get("event_id")
    pedido_id_str: Optional[str] = payload.get("pedido_id")
    direccion: Optional[str] = payload.get("direccion_entrega", "Dirección no especificada")

    if not pedido_id_str:
        logger.warning("Invalid payment.succeeded payload – missing pedido_id: %s", payload)
        return

    try:
        pedido_id = uuid.UUID(pedido_id_str)
    except ValueError:
        logger.warning("Invalid pedido_id format: %s", pedido_id_str)
        return

    repo = EntregaRepository()

    async with async_session() as db:
        try:
            # DB-level idempotency check
            if event_id and await repo.event_exists(db, event_id):
                logger.debug("Event %s already processed (DB check)", event_id)
                return

            # Check if a delivery already exists for this order
            existing = await repo.get_by_pedido_id(db, pedido_id)
            if existing is not None:
                logger.info(
                    "Delivery already exists for pedido %s – skipping", pedido_id
                )
                return

            # Generate tracking number
            import random
            import string

            chars = string.ascii_uppercase + string.digits
            guia = f"MA-{''.join(random.choices(chars, k=8))}"

            # Schedule delivery 3 days from now
            fecha_programada = datetime.now(timezone.utc) + timedelta(days=3)

            from app.models import Entrega

            entrega = Entrega(
                pedido_id=pedido_id,
                estado="programada",
                guia=guia,
                fecha_programada=fecha_programada,
                direccion=direccion,
            )

            entrega = await repo.create(db, entrega)

            # Record the consumed event for idempotency
            if event_id:
                await repo.record_event(
                    db,
                    entrega_id=entrega.id,
                    event_id=event_id,
                    evento="payment.succeeded",
                    payload=payload,
                )

            await db.commit()

            logger.info(
                "Delivery %s scheduled for pedido %s (guia=%s)",
                entrega.id,
                pedido_id,
                guia,
            )

            # Publish entrega.programada event
            try:
                from app.events.producer import kafka_producer

                if kafka_producer is not None:
                    new_event_id = str(uuid.uuid4())
                    await kafka_producer.publish(
                        topic="entrega.programada",
                        key=str(entrega.id),
                        value={
                            "event": "entrega.programada",
                            "event_id": new_event_id,
                            "entrega_id": str(entrega.id),
                            "pedido_id": str(pedido_id),
                            "guia": guia,
                            "fecha_programada": fecha_programada.isoformat(),
                            "direccion": direccion,
                        },
                    )
            except Exception as exc:
                logger.warning("Failed to publish entrega.programada: %s", exc)

        except Exception as exc:
            await db.rollback()
            logger.error(
                "Failed to create delivery for pedido %s: %s", pedido_id_str, exc
            )
            raise
