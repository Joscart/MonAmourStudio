import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas ───────────────────────────────────────────────────────────


class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None


# ── Response Schemas ──────────────────────────────────────────────────────────


class UsuarioResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    email: str
    rol: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
