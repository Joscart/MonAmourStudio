import hmac
import os
import time
from hashlib import sha256
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="Pedidos Service", version="0.1.0")


class OrderRequest(BaseModel):
    customer_id: str
    items: list[str]
    total: float


class OrderResponse(BaseModel):
    id: str
    status: str
    total: float


async def get_settings():
    return {
        "seed": os.getenv("SEED", "false"),
        "database_url": os.getenv("DATABASE_URL", ""),
        "redis_url": os.getenv("REDIS_URL", ""),
        "minio_endpoint": os.getenv("MINIO_ENDPOINT", ""),
        "payphone_secret": os.getenv("PAYPHONE_HMAC_SECRET", ""),
    }


@app.get("/healthz")
async def healthcheck():
    return {"status": "ok", "service": "pedidos", "ts": int(time.time())}


@app.get("/metrics")
async def metrics():
    return {"uptime_seconds": int(time.time()), "version": app.version}


@app.post("/orders", status_code=status.HTTP_201_CREATED, response_model=OrderResponse)
async def create_order(payload: OrderRequest, settings: dict = Depends(get_settings)):
    order_id = f"order-{int(time.time())}"
    return OrderResponse(id=order_id, status="pending", total=payload.total)


@app.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, settings: dict = Depends(get_settings)):
    if not order_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return OrderResponse(id=order_id, status="pending", total=0.0)


@app.post("/orders/{order_id}/pay-webhook")
async def pay_webhook(order_id: str, payload: dict, x_signature: Optional[str] = Header(None), settings: dict = Depends(get_settings)):
    secret = settings.get("payphone_secret")
    if secret:
        expected = hmac.new(secret.encode(), msg=str(payload).encode(), digestmod=sha256).hexdigest()
        if not hmac.compare_digest(expected, x_signature or ""):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    return {"order_id": order_id, "status": "paid", "received": True}
