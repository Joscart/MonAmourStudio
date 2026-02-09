from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@postgres-inventario:5432/inventario"
    )

    # ── MinIO ─────────────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "inventory"

    # ── Kafka ─────────────────────────────────────────────────────────
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"

    # ── OpenTelemetry ─────────────────────────────────────────────────
    OTLP_ENDPOINT: str = "http://jaeger:4317"

    # ── Service ───────────────────────────────────────────────────────
    SERVICE_NAME: str = "inventario"

    # ── gRPC ──────────────────────────────────────────────────────────
    GRPC_PORT: int = 50052

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
