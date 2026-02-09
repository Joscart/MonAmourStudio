import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import CampanaCreate, CampanaResponse, CampanaUpdate
from app.services.campanas import CampanaService

router = APIRouter(prefix="/campanas", tags=["campanas"])
service = CampanaService()


# ── Create Campaign ───────────────────────────────────────────────────────────


@router.post("/", response_model=CampanaResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampanaCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new marketing campaign."""
    campana = await service.create_campaign(db, data)
    return CampanaResponse.from_model(campana)


# ── List Campaigns ────────────────────────────────────────────────────────────


@router.get("/", response_model=List[CampanaResponse])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
):
    """List all campaigns."""
    campanas = await service.list_campaigns(db)
    return [CampanaResponse.from_model(c) for c in campanas]


# ── Get Campaign Detail ──────────────────────────────────────────────────────


@router.get("/{campana_id}", response_model=CampanaResponse)
async def get_campaign(
    campana_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get campaign detail including publications count."""
    campana = await service.get_campaign(db, campana_id)
    if campana is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaña no encontrada",
        )
    return CampanaResponse.from_model(campana)


# ── Update Campaign ──────────────────────────────────────────────────────────


@router.put("/{campana_id}", response_model=CampanaResponse)
async def update_campaign(
    campana_id: uuid.UUID,
    data: CampanaUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing campaign."""
    campana = await service.update_campaign(db, campana_id, data)
    if campana is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaña no encontrada",
        )
    return CampanaResponse.from_model(campana)


# ── Activate Campaign ────────────────────────────────────────────────────────


@router.post("/{campana_id}/activar", response_model=CampanaResponse)
async def activate_campaign(
    campana_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Activate a campaign and publish the campana.activada event."""
    campana = await service.activate_campaign(db, campana_id)
    if campana is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaña no encontrada",
        )
    return CampanaResponse.from_model(campana)


# ── Delete Campaign ──────────────────────────────────────────────────────────


@router.delete("/{campana_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campana_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a campaign and all its publications."""
    deleted = await service.delete_campaign(db, campana_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaña no encontrada",
        )
