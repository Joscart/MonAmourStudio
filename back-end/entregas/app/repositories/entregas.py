import uuid
from typing import Any, Optional

from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Entrega, EntregaEvento


class EntregaRepository:
    """Data-access layer – all DB queries for the Entrega entities."""

    # ── Create ────────────────────────────────────────────────────────

    async def create(self, db: AsyncSession, entrega: Entrega) -> Entrega:
        db.add(entrega)
        await db.flush()
        await db.refresh(entrega)
        return entrega

    # ── Get by ID ─────────────────────────────────────────────────────

    async def get_by_id(
        self, db: AsyncSession, entrega_id: uuid.UUID
    ) -> Optional[Entrega]:
        result = await db.execute(
            select(Entrega).where(Entrega.id == entrega_id)
        )
        return result.scalars().first()

    # ── Get by Pedido ID ──────────────────────────────────────────────

    async def get_by_pedido_id(
        self, db: AsyncSession, pedido_id: uuid.UUID
    ) -> Optional[Entrega]:
        result = await db.execute(
            select(Entrega).where(Entrega.pedido_id == pedido_id)
        )
        return result.scalars().first()

    # ── List all ──────────────────────────────────────────────────────

    async def list_all(self, db: AsyncSession) -> list[Entrega]:
        result = await db.execute(
            select(Entrega).order_by(Entrega.created_at.desc())
        )
        return list(result.scalars().all())

    # ── Update ────────────────────────────────────────────────────────

    async def update(
        self,
        db: AsyncSession,
        entrega_id: uuid.UUID,
        values: dict[str, Any],
    ) -> Optional[Entrega]:
        stmt = (
            sa_update(Entrega)
            .where(Entrega.id == entrega_id)
            .values(**values)
            .returning(Entrega)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
            return await self.get_by_id(db, entrega_id)
        return None

    # ── Record Event (idempotency) ────────────────────────────────────

    async def record_event(
        self,
        db: AsyncSession,
        entrega_id: uuid.UUID,
        event_id: str,
        evento: str,
        payload: dict[str, Any],
    ) -> EntregaEvento:
        event = EntregaEvento(
            entrega_id=entrega_id,
            event_id=event_id,
            evento=evento,
            payload=payload,
        )
        db.add(event)
        await db.flush()
        return event

    # ── Check if event already processed ──────────────────────────────

    async def event_exists(self, db: AsyncSession, event_id: str) -> bool:
        result = await db.execute(
            select(EntregaEvento).where(EntregaEvento.event_id == event_id)
        )
        return result.scalars().first() is not None
