import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Workflow Registry ─────────────────────────────────────────────────────────


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    trigger_event: str = Field(..., min_length=1, max_length=100)
    webhook_path: Optional[str] = None
    active: bool = False


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    trigger_event: Optional[str] = None
    webhook_path: Optional[str] = None
    active: Optional[bool] = None
    n8n_workflow_id: Optional[str] = None


class WorkflowResponse(BaseModel):
    id: uuid.UUID
    n8n_workflow_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    trigger_event: str
    webhook_path: Optional[str] = None
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Notification Preferences ─────────────────────────────────────────────────


class NotificationPreferenceCreate(BaseModel):
    usuario_id: uuid.UUID
    nombre_admin: str = Field(..., min_length=1, max_length=255)
    canal: str = Field(..., pattern=r"^(whatsapp|email)$")
    destino: str = Field(..., min_length=1, max_length=255)
    eventos: list[str] = Field(
        default_factory=lambda: ["order.created"],
        description="Event types to be notified about",
    )
    activo: bool = True


class NotificationPreferenceUpdate(BaseModel):
    nombre_admin: Optional[str] = None
    canal: Optional[str] = Field(None, pattern=r"^(whatsapp|email)$")
    destino: Optional[str] = None
    eventos: Optional[list[str]] = None
    activo: Optional[bool] = None


class NotificationPreferenceResponse(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    nombre_admin: str
    canal: str
    destino: str
    eventos: list[str]
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── n8n Proxy ─────────────────────────────────────────────────────────────────


class N8nWorkflowSummary(BaseModel):
    id: str
    name: str
    active: bool
    created_at: Optional[str] = Field(None, alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")

    model_config = {"populate_by_name": True}


class N8nExecutionSummary(BaseModel):
    id: str
    finished: bool
    mode: str
    status: Optional[str] = None
    started_at: Optional[str] = Field(None, alias="startedAt")
    stopped_at: Optional[str] = Field(None, alias="stoppedAt")
    workflow_id: Optional[str] = Field(None, alias="workflowId")

    model_config = {"populate_by_name": True}


class TriggerRequest(BaseModel):
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
