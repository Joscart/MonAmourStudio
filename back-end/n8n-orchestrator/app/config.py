from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@postgres-orchestrator:5432/orchestrator"
    )

    # ── n8n ───────────────────────────────────────────────────────────
    N8N_BASE_URL: str = "http://n8n:5678"
    N8N_API_KEY: str = ""

    # ── Kafka ─────────────────────────────────────────────────────────
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"

    # ── OpenTelemetry ─────────────────────────────────────────────────
    OTLP_ENDPOINT: str = "http://jaeger:4317"

    # ── Service ───────────────────────────────────────────────────────
    SERVICE_NAME: str = "n8n-orchestrator"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
