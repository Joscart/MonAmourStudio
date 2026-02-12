"""Async HTTP client for n8n REST API v1."""

import logging
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class N8nClient:
    """Thin wrapper around the n8n public REST API."""

    def __init__(self) -> None:
        self._base = settings.N8N_BASE_URL.rstrip("/")
        self._headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if settings.N8N_API_KEY:
            self._headers["X-N8N-API-KEY"] = settings.N8N_API_KEY

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._base,
            headers=self._headers,
            timeout=30.0,
        )

    # ── Workflows ─────────────────────────────────────────────────────

    async def list_workflows(self) -> list[dict[str, Any]]:
        async with self._client() as c:
            r = await c.get("/api/v1/workflows")
            r.raise_for_status()
            return r.json().get("data", [])

    async def get_workflow(self, workflow_id: str) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.get(f"/api/v1/workflows/{workflow_id}")
            r.raise_for_status()
            return r.json()

    async def create_workflow(self, body: dict[str, Any]) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.post("/api/v1/workflows", json=body)
            r.raise_for_status()
            return r.json()

    async def update_workflow(
        self, workflow_id: str, body: dict[str, Any]
    ) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.put(f"/api/v1/workflows/{workflow_id}", json=body)
            r.raise_for_status()
            return r.json()

    async def delete_workflow(self, workflow_id: str) -> None:
        async with self._client() as c:
            r = await c.delete(f"/api/v1/workflows/{workflow_id}")
            r.raise_for_status()

    async def activate_workflow(self, workflow_id: str) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.post(f"/api/v1/workflows/{workflow_id}/activate")
            r.raise_for_status()
            return r.json()

    async def deactivate_workflow(self, workflow_id: str) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.post(f"/api/v1/workflows/{workflow_id}/deactivate")
            r.raise_for_status()
            return r.json()

    # ── Executions ────────────────────────────────────────────────────

    async def list_executions(
        self,
        workflow_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit}
        if workflow_id:
            params["workflowId"] = workflow_id
        if status:
            params["status"] = status
        async with self._client() as c:
            r = await c.get("/api/v1/executions", params=params)
            r.raise_for_status()
            return r.json().get("data", [])

    async def get_execution(self, execution_id: str) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.get(f"/api/v1/executions/{execution_id}")
            r.raise_for_status()
            return r.json()

    # ── Webhooks (trigger a workflow) ─────────────────────────────────

    async def trigger_webhook(
        self, path: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        """Call an n8n webhook trigger node.

        *path* is the webhook path configured in the Webhook node,
        e.g. ``order-notification``.  The full URL becomes
        ``{base}/webhook/{path}``.
        """
        async with self._client() as c:
            r = await c.post(f"/webhook/{path}", json=payload)
            r.raise_for_status()
            return r.json()

    async def trigger_webhook_test(
        self, path: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        """Call the *test* webhook (only when workflow is open in n8n UI)."""
        async with self._client() as c:
            r = await c.post(f"/webhook-test/{path}", json=payload)
            r.raise_for_status()
            return r.json()

    # ── Health ────────────────────────────────────────────────────────

    async def health(self) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.get("/healthz")
            r.raise_for_status()
            return {"status": "ok", "n8n": True}


# Module-level singleton
n8n_client = N8nClient()
