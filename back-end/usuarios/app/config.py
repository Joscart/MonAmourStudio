from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@postgres-usuarios:5432/usuarios"
    )

    # ── Redis ─────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    # ── MinIO ─────────────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "users"

    # ── Kafka ─────────────────────────────────────────────────────────
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    # ── Admin ─────────────────────────────────────────────────────
    ADMIN_EMAIL: str = ""
    # ── Google OAuth ──────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    # ── JWT ───────────────────────────────────────────────────────────
    JWT_SECRET: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # ── OpenTelemetry ─────────────────────────────────────────────────
    OTLP_ENDPOINT: str = "http://jaeger:4317"

    # ── Service ───────────────────────────────────────────────────────
    SERVICE_NAME: str = "usuarios"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
