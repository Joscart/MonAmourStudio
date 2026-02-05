import os
import time
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="Campanas Service", version="0.1.0")


class CampaignCreate(BaseModel):
    name: str
    budget: float
    description: Optional[str] = None


class PublicationCreate(BaseModel):
    channel: str
    scheduled_at: Optional[str] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    budget: float


async def get_settings():
    return {
        "seed": os.getenv("SEED", "false"),
        "database_url": os.getenv("DATABASE_URL", ""),
        "minio_endpoint": os.getenv("MINIO_ENDPOINT", ""),
    }


@app.get("/healthz")
async def healthcheck():
    return {"status": "ok", "service": "campanas", "ts": int(time.time())}


@app.get("/metrics")
async def metrics():
    return {"uptime_seconds": int(time.time()), "version": app.version}


@app.post("/campaigns", status_code=status.HTTP_201_CREATED, response_model=CampaignResponse)
async def create_campaign(payload: CampaignCreate, settings: dict = Depends(get_settings)):
    campaign_id = f"campaign-{int(time.time())}"
    return CampaignResponse(id=campaign_id, name=payload.name, budget=payload.budget)


@app.post("/campaigns/{campaign_id}/publications")
async def add_publication(campaign_id: str, payload: PublicationCreate, settings: dict = Depends(get_settings)):
    if not campaign_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return {"campaign_id": campaign_id, "publication": payload.dict(), "status": "scheduled"}
