import logging
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Publicacion
from app.repositories.publicaciones import PublicacionRepository
from app.schemas import PublicacionCreate

logger = logging.getLogger(__name__)


class PublicacionService:
    """Business-logic layer for publication management."""

    def __init__(self) -> None:
        self.repo = PublicacionRepository()

    # ── Create Publication ────────────────────────────────────────────

    async def create_publication(
        self, db: AsyncSession, data: PublicacionCreate
    ) -> Publicacion:
        pub = Publicacion(
            campana_id=data.campana_id,
            tipo_media=data.tipo_media,
            media_url=data.media_url,
            caption=data.caption,
            canal=data.canal,
            scheduled_at=data.scheduled_at,
            publicada=False,
        )
        pub = await self.repo.create(db, pub)
        logger.info("Publication created: %s for campaign %s", pub.id, pub.campana_id)
        return pub

    # ── List by Campaign ──────────────────────────────────────────────

    async def list_by_campaign(
        self, db: AsyncSession, campana_id: uuid.UUID
    ) -> list[Publicacion]:
        return await self.repo.list_by_campaign(db, campana_id)

    # ── Publish (Execute) ─────────────────────────────────────────────

    async def publish(
        self, db: AsyncSession, pub_id: uuid.UUID
    ) -> Optional[Publicacion]:
        pub = await self.repo.get_by_id(db, pub_id)
        if pub is None:
            return None

        updated = await self.repo.update(db, pub_id, {"publicada": True})

        # Publish publicacion.publicada event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="publicacion.publicada",
                    key=str(pub_id),
                    value={
                        "event": "publicacion.publicada",
                        "event_id": str(uuid.uuid4()),
                        "publicacion_id": str(pub_id),
                        "campana_id": str(pub.campana_id),
                        "canal": pub.canal,
                        "tipo_media": pub.tipo_media,
                    },
                )
                logger.info("Published publicacion.publicada event for %s", pub_id)
        except Exception as exc:
            logger.warning("Failed to publish publicacion.publicada event: %s", exc)

        return updated

    # ── Schedule ──────────────────────────────────────────────────────

    async def schedule(
        self, db: AsyncSession, pub_id: uuid.UUID, scheduled_at: datetime
    ) -> Optional[Publicacion]:
        pub = await self.repo.get_by_id(db, pub_id)
        if pub is None:
            return None

        updated = await self.repo.update(db, pub_id, {"scheduled_at": scheduled_at})

        # Publish publicacion.programada event (best-effort)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="publicacion.programada",
                    key=str(pub_id),
                    value={
                        "event": "publicacion.programada",
                        "event_id": str(uuid.uuid4()),
                        "publicacion_id": str(pub_id),
                        "campana_id": str(pub.campana_id),
                        "scheduled_at": scheduled_at.isoformat(),
                    },
                )
                logger.info("Published publicacion.programada event for %s", pub_id)
        except Exception as exc:
            logger.warning("Failed to publish publicacion.programada event: %s", exc)

        return updated

    # ── Delete ─────────────────────────────────────────────────────────────────

    async def delete(
        self, db: AsyncSession, pub_id: uuid.UUID
    ) -> bool:
        deleted = await self.repo.delete(db, pub_id)
        if deleted:
            logger.info("Publication deleted: %s", pub_id)
        return deleted
