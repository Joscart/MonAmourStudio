import uuid
from typing import Any, Optional

from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Pedido, PedidoEvento, PedidoItem


class PedidoRepository:
    """Data-access layer – all DB queries for the Pedido entities."""

    # ── Create ────────────────────────────────────────────────────────

    async def create(
        self, db: AsyncSession, pedido: Pedido, items: list[PedidoItem]
    ) -> Pedido:
        db.add(pedido)
        await db.flush()

        for item in items:
            item.pedido_id = pedido.id
            db.add(item)

        await db.flush()
        await db.refresh(pedido, attribute_names=["items"])
        return pedido

    # ── Get by ID (with items eagerly loaded) ─────────────────────────

    async def get_by_id(
        self, db: AsyncSession, pedido_id: uuid.UUID
    ) -> Optional[Pedido]:
        result = await db.execute(
            select(Pedido)
            .options(selectinload(Pedido.items))
            .where(Pedido.id == pedido_id)
        )
        return result.scalars().first()

    # ── List by user ──────────────────────────────────────────────────

    async def list_by_user(
        self,
        db: AsyncSession,
        usuario_id: Optional[uuid.UUID] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Pedido]:
        stmt = select(Pedido).options(selectinload(Pedido.items))

        if usuario_id is not None:
            stmt = stmt.where(Pedido.usuario_id == usuario_id)

        stmt = (
            stmt.order_by(Pedido.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(stmt)
        return list(result.scalars().unique().all())

    # ── Update status ─────────────────────────────────────────────────

    async def update_status(
        self, db: AsyncSession, pedido_id: uuid.UUID, new_status: str
    ) -> Optional[Pedido]:
        stmt = (
            sa_update(Pedido)
            .where(Pedido.id == pedido_id)
            .values(estado=new_status)
            .returning(Pedido)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
            # Re-fetch with items
            return await self.get_by_id(db, pedido_id)
        return None

    # ── Record Event (idempotency) ────────────────────────────────────

    async def record_event(
        self,
        db: AsyncSession,
        pedido_id: uuid.UUID,
        event_id: str,
        evento: str,
        payload: dict[str, Any],
    ) -> PedidoEvento:
        event = PedidoEvento(
            pedido_id=pedido_id,
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
            select(PedidoEvento).where(PedidoEvento.event_id == event_id)
        )
        return result.scalars().first() is not None
