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
    telefono: Optional[str] = Field(None, max_length=30)
    foto_url: Optional[str] = Field(None, max_length=500)


class RoleUpdate(BaseModel):
    rol: str = Field(..., pattern=r"^(admin|cliente)$")


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


# ── Dirección Schemas ─────────────────────────────────────────────────────────


class DireccionCreate(BaseModel):
    etiqueta: str = Field(default="Casa", max_length=60)
    linea1: str = Field(..., min_length=1, max_length=255)
    linea2: Optional[str] = Field(None, max_length=255)
    ciudad: str = Field(..., min_length=1, max_length=120)
    provincia: str = Field(..., min_length=1, max_length=120)
    codigo_postal: str = Field(..., min_length=1, max_length=20)
    pais: str = Field(default="Ecuador", max_length=60)
    es_principal: bool = False


class DireccionUpdate(BaseModel):
    etiqueta: Optional[str] = Field(None, max_length=60)
    linea1: Optional[str] = Field(None, min_length=1, max_length=255)
    linea2: Optional[str] = Field(None, max_length=255)
    ciudad: Optional[str] = Field(None, min_length=1, max_length=120)
    provincia: Optional[str] = Field(None, min_length=1, max_length=120)
    codigo_postal: Optional[str] = Field(None, min_length=1, max_length=20)
    pais: Optional[str] = Field(None, max_length=60)
    es_principal: Optional[bool] = None


class DireccionResponse(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    etiqueta: str
    linea1: str
    linea2: Optional[str] = None
    ciudad: str
    provincia: str
    codigo_postal: str
    pais: str
    es_principal: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Método de Pago Schemas ────────────────────────────────────────────────────


class MetodoPagoCreate(BaseModel):
    tipo: str = Field(default="Visa", max_length=30)
    ultimos_4: str = Field(..., min_length=4, max_length=4)
    titular: str = Field(..., min_length=1, max_length=120)
    expiracion: str = Field(..., pattern=r"^\d{2}/\d{4}$")  # MM/YYYY
    es_principal: bool = False


class MetodoPagoResponse(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    tipo: str
    ultimos_4: str
    titular: str
    expiracion: str
    es_principal: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Response Schemas ──────────────────────────────────────────────────────────


class UsuarioResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    email: str
    rol: str
    telefono: Optional[str] = None
    foto_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
