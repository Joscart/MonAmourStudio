import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas import (
    TokenResponse,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    UsuarioUpdate,
)
from app.services.usuarios import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])
security = HTTPBearer()
service = UsuarioService()


# ── Auth Dependency ───────────────────────────────────────────────────────────


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Validate JWT and return the payload (sub = user_id, rol)."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sin subject",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    user = await service.get_by_id(db, uuid.UUID(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
    return {"id": user.id, "email": user.email, "rol": user.rol}


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the authenticated user has the 'admin' role."""
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso solo para administradores",
        )
    return current_user


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    user = await service.register(db, data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: UsuarioLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return a JWT."""
    token = await service.authenticate(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile."""
    user = await service.get_by_id(db, current_user["id"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.put("/me", response_model=UsuarioResponse)
async def update_me(
    data: UsuarioUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile."""
    user = await service.update_profile(db, current_user["id"], data)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.get("/", response_model=List[UsuarioResponse])
async def list_users(
    _admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    return await service.list_users(db)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    _admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user by ID (admin only)."""
    deleted = await service.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return None
