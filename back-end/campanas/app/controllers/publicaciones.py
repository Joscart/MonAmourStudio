import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import PublicacionCreate, PublicacionResponse
from app.services.publicaciones import PublicacionService

router = APIRouter(prefix="/publicaciones", tags=["publicaciones"])
service = PublicacionService()


# ── Schedule body ─────────────────────────────────────────────────────────────


class ProgramarBody(BaseModel):
    scheduled_at: datetime


# ── Create Publication ────────────────────────────────────────────────────────


@router.post("/", response_model=PublicacionResponse, status_code=status.HTTP_201_CREATED)
async def create_publication(
    data: PublicacionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new publication linked to a campaign."""
    return await service.create_publication(db, data)


# ── List Publications by Campaign ────────────────────────────────────────────


@router.get("/campana/{campana_id}", response_model=List[PublicacionResponse])
async def list_by_campaign(
    campana_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all publications for a given campaign."""
    return await service.list_by_campaign(db, campana_id)


# ── Publish (Execute) a Publication ──────────────────────────────────────────


@router.post("/{pub_id}/publicar", response_model=PublicacionResponse)
async def publish_publication(
    pub_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Mark a publication as published and emit the event."""
    pub = await service.publish(db, pub_id)
    if pub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada",
        )
    return pub


# ── Schedule a Publication ───────────────────────────────────────────────────


@router.post("/{pub_id}/programar", response_model=PublicacionResponse)
async def schedule_publication(
    pub_id: uuid.UUID,
    body: ProgramarBody,
    db: AsyncSession = Depends(get_db),
):
    """Schedule a publication for a specific date/time."""
    pub = await service.schedule(db, pub_id, body.scheduled_at)
    if pub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada",
        )
    return pub
