import uuid
from typing import Any, Optional

from sqlalchemy import select, update as sa_update, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Campana


class CampanaRepository:
    """Data-access layer – all DB queries for the Campana entity."""

    # ── Create ────────────────────────────────────────────────────────

    async def create(self, db: AsyncSession, campana: Campana) -> Campana:
        db.add(campana)
        await db.flush()
        await db.refresh(campana)
        return campana

    # ── Get by ID (with publicaciones) ────────────────────────────────

    async def get_by_id(
        self, db: AsyncSession, campana_id: uuid.UUID
    ) -> Optional[Campana]:
        result = await db.execute(
            select(Campana)
            .options(selectinload(Campana.publicaciones))
            .where(Campana.id == campana_id)
        )
        return result.scalars().first()

    # ── List all ──────────────────────────────────────────────────────

    async def list_all(self, db: AsyncSession) -> list[Campana]:
        result = await db.execute(
            select(Campana)
            .options(selectinload(Campana.publicaciones))
            .order_by(Campana.created_at.desc())
        )
        return list(result.scalars().unique().all())

    # ── Update ────────────────────────────────────────────────────────

    async def update(
        self,
        db: AsyncSession,
        campana_id: uuid.UUID,
        values: dict[str, Any],
    ) -> Optional[Campana]:
        stmt = (
            sa_update(Campana)
            .where(Campana.id == campana_id)
            .values(**values)
            .returning(Campana)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
            return await self.get_by_id(db, campana_id)
        return None

    # ── Delete ────────────────────────────────────────────────────────

    async def delete(self, db: AsyncSession, campana_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Campana).where(Campana.id == campana_id)
        )
        await db.flush()
        return result.rowcount > 0
