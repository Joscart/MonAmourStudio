import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NotificationPreference


class NotificationPreferenceRepository:
    """Data-access layer for notification_preferences."""

    async def create(
        self, db: AsyncSession, pref: NotificationPreference
    ) -> NotificationPreference:
        db.add(pref)
        await db.flush()
        await db.refresh(pref)
        return pref

    async def get_by_id(
        self, db: AsyncSession, pref_id: uuid.UUID
    ) -> Optional[NotificationPreference]:
        result = await db.execute(
            select(NotificationPreference).where(NotificationPreference.id == pref_id)
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self, db: AsyncSession, usuario_id: uuid.UUID
    ) -> list[NotificationPreference]:
        result = await db.execute(
            select(NotificationPreference)
            .where(NotificationPreference.usuario_id == usuario_id)
            .order_by(NotificationPreference.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(
        self, db: AsyncSession
    ) -> list[NotificationPreference]:
        result = await db.execute(
            select(NotificationPreference).order_by(
                NotificationPreference.created_at.desc()
            )
        )
        return list(result.scalars().all())

    async def list_active_for_event(
        self, db: AsyncSession, event_type: str
    ) -> list[NotificationPreference]:
        """Return all active preferences that include *event_type* in their events list."""
        all_active = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.activo.is_(True)
            )
        )
        prefs = list(all_active.scalars().all())
        return [p for p in prefs if event_type in (p.eventos or [])]

    async def update(
        self, db: AsyncSession, pref_id: uuid.UUID, values: dict
    ) -> Optional[NotificationPreference]:
        await db.execute(
            update(NotificationPreference)
            .where(NotificationPreference.id == pref_id)
            .values(**values)
        )
        await db.flush()
        return await self.get_by_id(db, pref_id)

    async def delete(self, db: AsyncSession, pref_id: uuid.UUID) -> bool:
        result = await db.execute(
            delete(NotificationPreference).where(
                NotificationPreference.id == pref_id
            )
        )
        return result.rowcount > 0
