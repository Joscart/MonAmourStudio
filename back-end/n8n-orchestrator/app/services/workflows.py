import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WorkflowRegistry
from app.n8n_client import n8n_client
from app.repositories.workflows import WorkflowRepository
from app.schemas import WorkflowCreate, WorkflowUpdate

logger = logging.getLogger(__name__)


class WorkflowService:
    """Business-logic layer for workflow management + n8n proxy."""

    def __init__(self) -> None:
        self.repo = WorkflowRepository()

    # ── Local registry CRUD ───────────────────────────────────────────

    async def create_workflow(
        self, db: AsyncSession, data: WorkflowCreate
    ) -> WorkflowRegistry:
        wf = WorkflowRegistry(
            name=data.name,
            description=data.description,
            trigger_event=data.trigger_event,
            webhook_path=data.webhook_path,
            active=data.active,
        )
        wf = await self.repo.create(db, wf)
        logger.info("Workflow registered: %s (%s)", wf.name, wf.id)
        return wf

    async def list_workflows(self, db: AsyncSession) -> list[WorkflowRegistry]:
        return await self.repo.list_all(db)

    async def get_workflow(
        self, db: AsyncSession, wf_id: uuid.UUID
    ) -> Optional[WorkflowRegistry]:
        return await self.repo.get_by_id(db, wf_id)

    async def update_workflow(
        self, db: AsyncSession, wf_id: uuid.UUID, data: WorkflowUpdate
    ) -> Optional[WorkflowRegistry]:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.repo.get_by_id(db, wf_id)
        values["updated_at"] = datetime.now(timezone.utc)
        return await self.repo.update(db, wf_id, values)

    async def delete_workflow(
        self, db: AsyncSession, wf_id: uuid.UUID
    ) -> bool:
        return await self.repo.delete(db, wf_id)

    async def get_workflows_for_event(
        self, db: AsyncSession, event: str
    ) -> list[WorkflowRegistry]:
        return await self.repo.get_by_event(db, event)

    # ── n8n proxy ─────────────────────────────────────────────────────

    async def n8n_list_workflows(self) -> list[dict[str, Any]]:
        return await n8n_client.list_workflows()

    async def n8n_get_workflow(self, workflow_id: str) -> dict[str, Any]:
        return await n8n_client.get_workflow(workflow_id)

    async def n8n_activate(self, workflow_id: str) -> dict[str, Any]:
        return await n8n_client.activate_workflow(workflow_id)

    async def n8n_deactivate(self, workflow_id: str) -> dict[str, Any]:
        return await n8n_client.deactivate_workflow(workflow_id)

    async def n8n_list_executions(
        self,
        workflow_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        return await n8n_client.list_executions(workflow_id, status, limit)

    async def n8n_get_execution(self, execution_id: str) -> dict[str, Any]:
        return await n8n_client.get_execution(execution_id)

    # ── Trigger ───────────────────────────────────────────────────────

    async def trigger_workflow(
        self, db: AsyncSession, event_type: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """Find all registered workflows for *event_type* and trigger them via webhook."""
        workflows = await self.repo.get_by_event(db, event_type)
        results: list[dict[str, Any]] = []
        for wf in workflows:
            if not wf.webhook_path:
                logger.warning(
                    "Workflow %s has no webhook_path – skipping", wf.name
                )
                continue
            try:
                resp = await n8n_client.trigger_webhook(wf.webhook_path, payload)
                results.append(
                    {"workflow": wf.name, "status": "triggered", "response": resp}
                )
                logger.info("Triggered workflow %s via webhook %s", wf.name, wf.webhook_path)
            except Exception as exc:
                results.append(
                    {"workflow": wf.name, "status": "error", "error": str(exc)}
                )
                logger.error("Failed to trigger %s: %s", wf.name, exc)
        return results
