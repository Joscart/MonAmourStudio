from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import ConfiguracionTiendaResponse, ConfiguracionTiendaUpdate
from app.services.tienda import TiendaService
from app.services.storage import upload_file, delete_file, get_public_url

router = APIRouter(prefix="/campanas/tienda", tags=["tienda"])
service = TiendaService()


@router.get("/config", response_model=ConfiguracionTiendaResponse)
async def get_config(db: AsyncSession = Depends(get_db)):
    """Get the store configuration (public – no auth required)."""
    config = await service.get_config(db)
    if config is None:
        return ConfiguracionTiendaResponse()
    return config


@router.put("/config", response_model=ConfiguracionTiendaResponse)
async def update_config(
    data: ConfiguracionTiendaUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update the store configuration."""
    config = await service.update_config(db, data)
    return config


@router.post("/logo", response_model=ConfiguracionTiendaResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace the store logo (PNG, SVG, JPG, WebP)."""
    contents = await file.read()
    content_type = file.content_type or "application/octet-stream"

    try:
        object_name = upload_file(contents, content_type, prefix="logo")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )

    logo_url = get_public_url(object_name)

    # Delete old logo if exists
    config = await service.get_config(db)
    if config and config.logo_url:
        bucket_prefix = f"/storage/{__import__('app.config', fromlist=['settings']).settings.MINIO_BUCKET}/"
        if bucket_prefix in (config.logo_url or ""):
            old_key = config.logo_url.split(bucket_prefix, 1)[-1]
            if old_key:
                delete_file(old_key)

    updated = await service.update_config(
        db, ConfiguracionTiendaUpdate(logo_url=logo_url)
    )
    return updated
