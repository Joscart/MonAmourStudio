import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WorkflowRegistry


class WorkflowRepository:
    """Data-access layer for workflow_registry."""

    async def create(self, db: AsyncSession, wf: WorkflowRegistry) -> WorkflowRegistry:
        db.add(wf)
        await db.flush()
        await db.refresh(wf)
        return wf

    async def get_by_id(
        self, db: AsyncSession, wf_id: uuid.UUID
    ) -> Optional[WorkflowRegistry]:
        result = await db.execute(
            select(WorkflowRegistry).where(WorkflowRegistry.id == wf_id)
        )
        return result.scalar_one_or_none()

    async def get_by_event(
        self, db: AsyncSession, event: str
    ) -> list[WorkflowRegistry]:
        result = await db.execute(
            select(WorkflowRegistry).where(
                WorkflowRegistry.trigger_event == event,
                WorkflowRegistry.active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def list_all(self, db: AsyncSession) -> list[WorkflowRegistry]:
        result = await db.execute(
            select(WorkflowRegistry).order_by(WorkflowRegistry.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(
        self, db: AsyncSession, wf_id: uuid.UUID, values: dict
    ) -> Optional[WorkflowRegistry]:
        await db.execute(
            update(WorkflowRegistry)
            .where(WorkflowRegistry.id == wf_id)
            .values(**values)
        )
        await db.flush()
        return await self.get_by_id(db, wf_id)

    async def delete(self, db: AsyncSession, wf_id: uuid.UUID) -> bool:
        result = await db.execute(
            delete(WorkflowRegistry).where(WorkflowRegistry.id == wf_id)
        )
        return result.rowcount > 0
