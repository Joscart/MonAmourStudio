import os
import time
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="Inventario Service", version="0.1.0")


class Product(BaseModel):
    id: str
    name: str
    price: float
    description: Optional[str] = None


async def get_settings():
    return {
        "seed": os.getenv("SEED", "false"),
        "database_url": os.getenv("DATABASE_URL", ""),
        "minio_endpoint": os.getenv("MINIO_ENDPOINT", ""),
    }


@app.get("/healthz")
async def healthcheck():
    return {"status": "ok", "service": "inventario", "ts": int(time.time())}


@app.get("/metrics")
async def metrics():
    return {"uptime_seconds": int(time.time()), "version": app.version}


@app.get("/products", response_model=list[Product])
async def list_products(settings: dict = Depends(get_settings)):
    return []


@app.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, settings: dict = Depends(get_settings)):
    if not product_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return Product(id=product_id, name=f"product-{product_id}", price=0.0, description=None)
