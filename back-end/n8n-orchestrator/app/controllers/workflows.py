import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    TriggerRequest,
    WorkflowCreate,
    WorkflowResponse,
    WorkflowUpdate,
)
from app.services.workflows import WorkflowService

router = APIRouter(prefix="/orchestrator/workflows", tags=["workflows"])
service = WorkflowService()


# ── Local Registry CRUD ───────────────────────────────────────────────────────


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new workflow mapping (event → n8n webhook)."""
    wf = await service.create_workflow(db, data)
    return wf


@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(db: AsyncSession = Depends(get_db)):
    """List all registered workflows."""
    return await service.list_workflows(db)


@router.get("/{wf_id}", response_model=WorkflowResponse)
async def get_workflow(
    wf_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    wf = await service.get_workflow(db, wf_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow no encontrado")
    return wf


@router.put("/{wf_id}", response_model=WorkflowResponse)
async def update_workflow(
    wf_id: uuid.UUID,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
):
    wf = await service.update_workflow(db, wf_id, data)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow no encontrado")
    return wf


@router.delete("/{wf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    wf_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    if not await service.delete_workflow(db, wf_id):
        raise HTTPException(status_code=404, detail="Workflow no encontrado")


# ── Trigger ───────────────────────────────────────────────────────────────────


@router.post("/trigger")
async def trigger_workflow(
    data: TriggerRequest,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger all workflows registered for *event_type*."""
    results = await service.trigger_workflow(db, data.event_type, data.payload)
    return {"triggered": len(results), "results": results}


# ── n8n Proxy ─────────────────────────────────────────────────────────────────


@router.get("/n8n/list")
async def n8n_list_workflows():
    """List all workflows in n8n (proxy)."""
    try:
        return await service.n8n_list_workflows()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error de n8n: {exc}")


@router.get("/n8n/{workflow_id}")
async def n8n_get_workflow(workflow_id: str):
    try:
        return await service.n8n_get_workflow(workflow_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error de n8n: {exc}")


@router.post("/n8n/{workflow_id}/activate")
async def n8n_activate_workflow(workflow_id: str):
    try:
        return await service.n8n_activate(workflow_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error de n8n: {exc}")


@router.post("/n8n/{workflow_id}/deactivate")
async def n8n_deactivate_workflow(workflow_id: str):
    try:
        return await service.n8n_deactivate(workflow_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error de n8n: {exc}")


# ── Executions (n8n proxy) ────────────────────────────────────────────────────


@router.get("/n8n/executions/list")
async def n8n_list_executions(
    workflow_id: Optional[str] = Query(None),
    exec_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
):
    try:
        return await service.n8n_list_executions(workflow_id, exec_status, limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error de n8n: {exc}")


@router.get("/n8n/executions/{execution_id}")
async def n8n_get_execution(execution_id: str):
    try:
        return await service.n8n_get_execution(execution_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error de n8n: {exc}")
