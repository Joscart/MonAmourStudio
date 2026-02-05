import os
import time
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Usuarios Service", version="0.1.0")


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None


async def get_settings():
    return {
        "seed": os.getenv("SEED", "false"),
        "database_url": os.getenv("DATABASE_URL", ""),
        "redis_url": os.getenv("REDIS_URL", ""),
    }


@app.get("/healthz")
async def healthcheck():
    return {"status": "ok", "service": "usuarios", "ts": int(time.time())}


@app.get("/metrics")
async def metrics():
    return {"uptime_seconds": int(time.time()), "version": app.version}


@app.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def register(payload: RegisterPayload, settings: dict = Depends(get_settings)):
    if not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password required")
    user_id = "user_1"  # placeholder - replace with DB
    return UserResponse(id=user_id, email=payload.email, full_name=payload.full_name)


@app.post("/auth/login")
async def login(payload: LoginPayload, settings: dict = Depends(get_settings)):
    token = "fake-jwt-token"  # replace with real auth
    return {"access_token": token, "token_type": "bearer"}


@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, settings: dict = Depends(get_settings)):
    if not user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(id=user_id, email="user@example.com", full_name=None)
