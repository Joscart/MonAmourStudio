import logging
import random
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Entrega
from app.repositories.entregas import EntregaRepository
from app.schemas import EntregaCreate, EntregaReagendar, EntregaUpdateEstado

logger = logging.getLogger(__name__)


def _generate_tracking_number() -> str:
    """Generate a unique tracking number (guia) like MA-XXXXXXXX."""
    chars = string.ascii_uppercase + string.digits
    code = "".join(random.choices(chars, k=8))
    return f"MA-{code}"


class EntregaService:
    """Business-logic layer for delivery management."""

    def __init__(self) -> None:
        self.repo = EntregaRepository()

    # ── Create Delivery ───────────────────────────────────────────────

    async def create_delivery(
        self, db: AsyncSession, data: EntregaCreate
    ) -> Entrega:
        guia = _generate_tracking_number()
        fecha_programada = data.fecha_programada or (
            datetime.now(timezone.utc) + timedelta(days=3)
        )

        entrega = Entrega(
            pedido_id=data.pedido_id,
            estado="programada",
            guia=guia,
            fecha_programada=fecha_programada,
            direccion=data.direccion,
        )

        entrega = await self.repo.create(db, entrega)

        # Publish entrega.programada event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                event_id = str(uuid.uuid4())
                await kafka_producer.publish(
                    topic="entrega.programada",
                    key=str(entrega.id),
                    value={
                        "event": "entrega.programada",
                        "event_id": event_id,
                        "entrega_id": str(entrega.id),
                        "pedido_id": str(entrega.pedido_id),
                        "guia": entrega.guia,
                        "fecha_programada": entrega.fecha_programada.isoformat()
                        if entrega.fecha_programada
                        else None,
                        "direccion": entrega.direccion,
                    },
                )
                await self.repo.record_event(
                    db,
                    entrega_id=entrega.id,
                    event_id=event_id,
                    evento="entrega.programada",
                    payload={
                        "entrega_id": str(entrega.id),
                        "pedido_id": str(entrega.pedido_id),
                    },
                )
        except Exception as exc:
            logger.warning("Failed to publish entrega.programada event: %s", exc)

        return entrega

    # ── Get Delivery ──────────────────────────────────────────────────

    async def get_delivery(
        self, db: AsyncSession, entrega_id: uuid.UUID
    ) -> Optional[Entrega]:
        return await self.repo.get_by_id(db, entrega_id)

    # ── Get by Order ID ───────────────────────────────────────────────

    async def get_by_pedido(
        self, db: AsyncSession, pedido_id: uuid.UUID
    ) -> Optional[Entrega]:
        return await self.repo.get_by_pedido_id(db, pedido_id)

    # ── List Deliveries ───────────────────────────────────────────────

    async def list_deliveries(self, db: AsyncSession) -> list[Entrega]:
        return await self.repo.list_all(db)

    # ── Update Status ─────────────────────────────────────────────────

    async def update_status(
        self,
        db: AsyncSession,
        entrega_id: uuid.UUID,
        data: EntregaUpdateEstado,
    ) -> Optional[Entrega]:
        entrega = await self.repo.get_by_id(db, entrega_id)
        if entrega is None:
            return None

        update_values: dict = {"estado": data.estado}
        if data.notas is not None:
            update_values["notas"] = data.notas

        # If the status is "entregada", record the actual delivery datetime
        if data.estado == "entregada":
            update_values["fecha_entrega"] = datetime.now(timezone.utc)

        entrega = await self.repo.update(db, entrega_id, update_values)

        # Record event + publish
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                event_id = str(uuid.uuid4())
                topic = f"entrega.{data.estado}"
                await kafka_producer.publish(
                    topic=topic,
                    key=str(entrega_id),
                    value={
                        "event": topic,
                        "event_id": event_id,
                        "entrega_id": str(entrega_id),
                        "pedido_id": str(entrega.pedido_id),
                        "estado": data.estado,
                    },
                )
                await self.repo.record_event(
                    db,
                    entrega_id=entrega_id,
                    event_id=event_id,
                    evento=topic,
                    payload={
                        "entrega_id": str(entrega_id),
                        "estado": data.estado,
                    },
                )
        except Exception as exc:
            logger.warning("Failed to publish entrega.%s event: %s", data.estado, exc)

        return entrega

    # ── Reschedule ────────────────────────────────────────────────────

    async def reschedule(
        self,
        db: AsyncSession,
        entrega_id: uuid.UUID,
        data: EntregaReagendar,
    ) -> Optional[Entrega]:
        entrega = await self.repo.get_by_id(db, entrega_id)
        if entrega is None:
            return None

        entrega = await self.repo.update(
            db, entrega_id, {"fecha_programada": data.fecha_programada}
        )

        # Publish reschedule event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                event_id = str(uuid.uuid4())
                await kafka_producer.publish(
                    topic="entrega.reagendada",
                    key=str(entrega_id),
                    value={
                        "event": "entrega.reagendada",
                        "event_id": event_id,
                        "entrega_id": str(entrega_id),
                        "pedido_id": str(entrega.pedido_id),
                        "fecha_programada": data.fecha_programada.isoformat(),
                    },
                )
                await self.repo.record_event(
                    db,
                    entrega_id=entrega_id,
                    event_id=event_id,
                    evento="entrega.reagendada",
                    payload={
                        "entrega_id": str(entrega_id),
                        "fecha_programada": data.fecha_programada.isoformat(),
                    },
                )
        except Exception as exc:
            logger.warning("Failed to publish entrega.reagendada event: %s", exc)

        return entrega
