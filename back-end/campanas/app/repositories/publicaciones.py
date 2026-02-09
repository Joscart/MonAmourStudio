import uuid
from typing import Any, Optional

from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Publicacion


class PublicacionRepository:
    """Data-access layer – all DB queries for the Publicacion entity."""

    # ── Create ────────────────────────────────────────────────────────

    async def create(self, db: AsyncSession, pub: Publicacion) -> Publicacion:
        db.add(pub)
        await db.flush()
        await db.refresh(pub)
        return pub

    # ── Get by ID ─────────────────────────────────────────────────────

    async def get_by_id(
        self, db: AsyncSession, pub_id: uuid.UUID
    ) -> Optional[Publicacion]:
        result = await db.execute(
            select(Publicacion).where(Publicacion.id == pub_id)
        )
        return result.scalars().first()

    # ── List by Campaign ──────────────────────────────────────────────

    async def list_by_campaign(
        self, db: AsyncSession, campana_id: uuid.UUID
    ) -> list[Publicacion]:
        result = await db.execute(
            select(Publicacion)
            .where(Publicacion.campana_id == campana_id)
            .order_by(Publicacion.created_at.desc())
        )
        return list(result.scalars().all())

    # ── Update ────────────────────────────────────────────────────────

    async def update(
        self,
        db: AsyncSession,
        pub_id: uuid.UUID,
        values: dict[str, Any],
    ) -> Optional[Publicacion]:
        stmt = (
            sa_update(Publicacion)
            .where(Publicacion.id == pub_id)
            .values(**values)
            .returning(Publicacion)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
            return await self.get_by_id(db, pub_id)
        return None
