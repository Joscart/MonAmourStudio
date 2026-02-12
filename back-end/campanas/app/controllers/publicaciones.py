import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import PublicacionCreate, PublicacionResponse
from app.services.publicaciones import PublicacionService
from app.services.storage import upload_file, get_public_url

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


# ── Upload Media ─────────────────────────────────────────────────────────────


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
):
    """Upload an image or video for a publication."""
    contents = await file.read()
    content_type = file.content_type or "application/octet-stream"

    try:
        object_name = upload_file(contents, content_type, prefix="publications")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )

    url = get_public_url(object_name)
    return {"url": url, "object_name": object_name}


# ── Delete Publication ───────────────────────────────────────────────────────


@router.delete("/{pub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_publication(
    pub_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a publication."""
    deleted = await service.delete(db, pub_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada",
        )
