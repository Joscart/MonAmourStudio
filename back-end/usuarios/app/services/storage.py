"""MinIO object-storage helper for user profile photos."""

import io
import logging
import uuid
from typing import Optional

from minio import Minio
from minio.error import S3Error

from app.config import settings

logger = logging.getLogger(__name__)

# ── Allowed MIME types ────────────────────────────────────────────────────────
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB for avatars

# Map MIME → extension
_EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _get_client() -> Minio:
    """Create a fresh MinIO client."""
    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=False,
    )


def _ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        logger.info("Created bucket '%s'", bucket)


def upload_avatar(
    file_data: bytes,
    content_type: str,
    user_id: str,
) -> str:
    """Upload a user avatar and return the object key."""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            f"Tipo de archivo no permitido: {content_type}. "
            f"Permitidos: {', '.join(ALLOWED_CONTENT_TYPES)}"
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise ValueError(
            f"Archivo demasiado grande ({len(file_data) / 1024 / 1024:.1f} MB). "
            f"Maximo: {MAX_FILE_SIZE / 1024 / 1024:.0f} MB."
        )

    ext = _EXT_MAP.get(content_type, ".bin")
    object_name = f"avatars/{user_id}/{uuid.uuid4().hex}{ext}"

    client = _get_client()
    _ensure_bucket(client, settings.MINIO_BUCKET)

    client.put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=object_name,
        data=io.BytesIO(file_data),
        length=len(file_data),
        content_type=content_type,
    )
    logger.info("Uploaded avatar %s (%s, %d bytes)", object_name, content_type, len(file_data))

    return object_name


def delete_avatar(object_name: str) -> None:
    """Delete an avatar from MinIO (best-effort)."""
    try:
        client = _get_client()
        client.remove_object(settings.MINIO_BUCKET, object_name)
        logger.info("Deleted avatar %s", object_name)
    except S3Error as exc:
        logger.warning("Could not delete avatar %s: %s", object_name, exc)


def get_public_url(object_name: str) -> str:
    """Build the public URL for a stored avatar (through Traefik)."""
    return f"/storage/{settings.MINIO_BUCKET}/{object_name}"
