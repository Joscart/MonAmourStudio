import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas import (
    DireccionCreate,
    DireccionResponse,
    DireccionUpdate,
    MetodoPagoCreate,
    MetodoPagoResponse,
    PasswordChange,
    RoleUpdate,
    TokenResponse,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    UsuarioUpdate,
)
from app.services.usuarios import UsuarioService
from app.services.storage import upload_avatar, delete_avatar, get_public_url

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


# ══════════════════════════════════════════════════════════════════════════════
#  Auth & Profile
# ══════════════════════════════════════════════════════════════════════════════


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    return await service.register(db, data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UsuarioLogin, db: AsyncSession = Depends(get_db)):
    token = await service.authenticate(db, data.email, data.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
    user = await service.update_profile(db, current_user["id"], data)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: PasswordChange,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.change_password(db, current_user["id"], data)
    return None


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_own_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_own_account(db, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return None


@router.post("/me/foto", response_model=UsuarioResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace the user's profile photo."""
    contents = await file.read()
    content_type = file.content_type or "application/octet-stream"
    user_id = str(current_user["id"])

    try:
        object_name = upload_avatar(contents, content_type, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    foto_url = get_public_url(object_name)

    # Delete old avatar if exists
    user = await service.get_by_id(db, current_user["id"])
    if user and user.foto_url:
        old_key = user.foto_url.replace(f"/storage/{settings.MINIO_BUCKET}/", "")
        if old_key:
            delete_avatar(old_key)

    updated = await service.update_profile(
        db, current_user["id"], UsuarioUpdate(foto_url=foto_url)
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated


@router.delete("/me/foto", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile_photo(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the user's profile photo."""
    user = await service.get_by_id(db, current_user["id"])
    if user and user.foto_url:
        old_key = user.foto_url.replace(f"/storage/{settings.MINIO_BUCKET}/", "")
        if old_key:
            delete_avatar(old_key)
        await service.update_profile(db, current_user["id"], UsuarioUpdate(foto_url=None))
    return None


# ══════════════════════════════════════════════════════════════════════════════
#  Direcciones (user's addresses)
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/me/direcciones", response_model=List[DireccionResponse])
async def list_direcciones(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_direcciones(db, current_user["id"])


@router.post("/me/direcciones", response_model=DireccionResponse, status_code=status.HTTP_201_CREATED)
async def create_direccion(
    data: DireccionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_direccion(db, current_user["id"], data)


@router.put("/me/direcciones/{direccion_id}", response_model=DireccionResponse)
async def update_direccion(
    direccion_id: uuid.UUID,
    data: DireccionUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d = await service.update_direccion(db, current_user["id"], direccion_id, data)
    if d is None:
        raise HTTPException(status_code=404, detail="Direccion no encontrada")
    return d


@router.delete("/me/direcciones/{direccion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_direccion(
    direccion_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await service.delete_direccion(db, current_user["id"], direccion_id):
        raise HTTPException(status_code=404, detail="Direccion no encontrada")


# ══════════════════════════════════════════════════════════════════════════════
#  Métodos de Pago (user's payment methods)
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/me/metodos-pago", response_model=List[MetodoPagoResponse])
async def list_metodos_pago(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_metodos_pago(db, current_user["id"])


@router.post("/me/metodos-pago", response_model=MetodoPagoResponse, status_code=status.HTTP_201_CREATED)
async def create_metodo_pago(
    data: MetodoPagoCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_metodo_pago(db, current_user["id"], data)


@router.delete("/me/metodos-pago/{metodo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metodo_pago(
    metodo_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await service.delete_metodo_pago(db, current_user["id"], metodo_id):
        raise HTTPException(status_code=404, detail="Metodo de pago no encontrado")


# ══════════════════════════════════════════════════════════════════════════════
#  Admin: User management
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/", response_model=List[UsuarioResponse])
async def list_users(
    _admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_users(db)


@router.get("/{user_id}", response_model=UsuarioResponse)
async def get_user(
    user_id: uuid.UUID,
    _admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.patch("/{user_id}/role", response_model=UsuarioResponse)
async def update_user_role(
    user_id: uuid.UUID,
    data: RoleUpdate,
    _admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await service.update_role(db, user_id, data.rol)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    _admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await service.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return None
