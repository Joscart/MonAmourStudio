import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    NotificationPreferenceCreate,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from app.services.notifications import NotificationService

router = APIRouter(prefix="/orchestrator/notifications", tags=["notifications"])
service = NotificationService()


@router.post(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_preference(
    data: NotificationPreferenceCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin notification preference."""
    return await service.create_preference(db, data)


@router.get("/preferences", response_model=List[NotificationPreferenceResponse])
async def list_preferences(db: AsyncSession = Depends(get_db)):
    """List all admin notification preferences."""
    return await service.list_preferences(db)


@router.get("/preferences/{pref_id}", response_model=NotificationPreferenceResponse)
async def get_preference(
    pref_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    pref = await service.get_preference(db, pref_id)
    if pref is None:
        raise HTTPException(status_code=404, detail="Preferencia no encontrada")
    return pref


@router.put("/preferences/{pref_id}", response_model=NotificationPreferenceResponse)
async def update_preference(
    pref_id: uuid.UUID,
    data: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
):
    pref = await service.update_preference(db, pref_id, data)
    if pref is None:
        raise HTTPException(status_code=404, detail="Preferencia no encontrada")
    return pref


@router.delete("/preferences/{pref_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preference(
    pref_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    if not await service.delete_preference(db, pref_id):
        raise HTTPException(status_code=404, detail="Preferencia no encontrada")


@router.post("/dispatch")
async def dispatch_notification(
    event_type: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Manually dispatch notifications for a given event type."""
    results = await service.dispatch_notification(db, event_type, payload)
    return {"dispatched": len(results), "results": results}
