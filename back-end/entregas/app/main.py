import os
import time
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="Entregas Service", version="0.1.0")


class DeliveryRequest(BaseModel):
    order_id: str
    address: str
    contact: Optional[str] = None


class DeliveryResponse(BaseModel):
    id: str
    status: str
    address: str


async def get_settings():
    return {
        "seed": os.getenv("SEED", "false"),
        "database_url": os.getenv("DATABASE_URL", ""),
    }


@app.get("/healthz")
async def healthcheck():
    return {"status": "ok", "service": "entregas", "ts": int(time.time())}


@app.get("/metrics")
async def metrics():
    return {"uptime_seconds": int(time.time()), "version": app.version}


@app.post("/deliveries", status_code=status.HTTP_201_CREATED, response_model=DeliveryResponse)
async def create_delivery(payload: DeliveryRequest, settings: dict = Depends(get_settings)):
    delivery_id = f"delivery-{int(time.time())}"
    return DeliveryResponse(id=delivery_id, status="created", address=payload.address)


@app.get("/deliveries/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(delivery_id: str, settings: dict = Depends(get_settings)):
    if not delivery_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    return DeliveryResponse(id=delivery_id, status="created", address="pending-address")
