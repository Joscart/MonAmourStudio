"""MinIO helper – upload / delete files in the campaigns bucket."""

import io
import uuid

from minio import Minio

from app.config import settings

_client: Minio | None = None


def _get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )
        if not _client.bucket_exists(settings.MINIO_BUCKET):
            _client.make_bucket(settings.MINIO_BUCKET)
    return _client


ALLOWED_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}


def upload_file(data: bytes, content_type: str, prefix: str = "logo") -> str:
    """Upload a file and return the object_name."""
    ext = ALLOWED_TYPES.get(content_type)
    if ext is None:
        raise ValueError(f"Tipo de archivo no permitido: {content_type}")

    object_name = f"{prefix}/{uuid.uuid4().hex}{ext}"
    client = _get_client()
    client.put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_name


def delete_file(object_name: str) -> None:
    """Delete a file from the bucket."""
    try:
        _get_client().remove_object(settings.MINIO_BUCKET, object_name)
    except Exception:
        pass


def get_public_url(object_name: str) -> str:
    """Return the public URL (via Traefik /storage/ proxy)."""
    return f"/storage/{settings.MINIO_BUCKET}/{object_name}"
