import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Campana
from app.repositories.campanas import CampanaRepository
from app.schemas import CampanaCreate, CampanaUpdate

logger = logging.getLogger(__name__)


class CampanaService:
    """Business-logic layer for campaign management."""

    def __init__(self) -> None:
        self.repo = CampanaRepository()

    # ── Create Campaign ───────────────────────────────────────────────

    async def create_campaign(
        self, db: AsyncSession, data: CampanaCreate
    ) -> Campana:
        campana = Campana(
            titulo=data.titulo,
            mensaje_global=data.mensaje_global,
            segmentacion=data.segmentacion,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            activa=False,
        )
        campana = await self.repo.create(db, campana)
        logger.info("Campaign created: %s", campana.id)
        return campana

    # ── List Campaigns ────────────────────────────────────────────────

    async def list_campaigns(self, db: AsyncSession) -> list[Campana]:
        return await self.repo.list_all(db)

    # ── Get Campaign ──────────────────────────────────────────────────

    async def get_campaign(
        self, db: AsyncSession, campana_id: uuid.UUID
    ) -> Optional[Campana]:
        return await self.repo.get_by_id(db, campana_id)

    # ── Update Campaign ───────────────────────────────────────────────

    async def update_campaign(
        self, db: AsyncSession, campana_id: uuid.UUID, data: CampanaUpdate
    ) -> Optional[Campana]:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.repo.get_by_id(db, campana_id)
        values["updated_at"] = datetime.now(timezone.utc)
        return await self.repo.update(db, campana_id, values)

    # ── Activate Campaign ─────────────────────────────────────────────

    async def activate_campaign(
        self, db: AsyncSession, campana_id: uuid.UUID
    ) -> Optional[Campana]:
        campana = await self.repo.get_by_id(db, campana_id)
        if campana is None:
            return None

        values = {
            "activa": True,
            "updated_at": datetime.now(timezone.utc),
        }
        campana = await self.repo.update(db, campana_id, values)

        # Publish campana.activada event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="campana.activada",
                    key=str(campana_id),
                    value={
                        "event": "campana.activada",
                        "event_id": str(uuid.uuid4()),
                        "campana_id": str(campana_id),
                        "titulo": campana.titulo,
                        "fecha_inicio": campana.fecha_inicio.isoformat()
                        if campana.fecha_inicio
                        else None,
                        "fecha_fin": campana.fecha_fin.isoformat()
                        if campana.fecha_fin
                        else None,
                    },
                )
                logger.info("Published campana.activada event for %s", campana_id)
        except Exception as exc:
            logger.warning("Failed to publish campana.activada event: %s", exc)

        return campana

    # ── Delete Campaign ───────────────────────────────────────────────

    async def delete_campaign(
        self, db: AsyncSession, campana_id: uuid.UUID
    ) -> bool:
        deleted = await self.repo.delete(db, campana_id)
        if deleted:
            logger.info("Campaign deleted: %s", campana_id)
        return deleted
