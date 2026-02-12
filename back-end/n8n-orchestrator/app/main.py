import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from app.config import settings
from app.controllers.health import router as health_router
from app.controllers.notifications import router as notifications_router
from app.controllers.workflows import router as workflows_router
from app.database import engine
from app.events.consumer import KafkaEventConsumer
from app.events.handlers import handle_event
from app.events.producer import KafkaEventProducer
from app.models import Base

logger = logging.getLogger(__name__)

# ── OpenTelemetry setup ──────────────────────────────────────────────────────

resource = Resource.create({"service.name": settings.SERVICE_NAME})
tracer_provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(endpoint=settings.OTLP_ENDPOINT, insecure=True)
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(tracer_provider)

# ── Module-level Kafka producer reference ─────────────────────────────────────
import app.events.producer as _producer_mod  # noqa: E402

# Topics the orchestrator consumes – this is the central hub
CONSUMED_TOPICS = [
    "order.created",
    "payment.succeeded",
    "inventory",          # stock.reserved, stock.released, product.created
    "entrega.programada",
    "entrega.en_transito",
    "entrega.entregada",
    "entrega.reagendada",
    "campana.activada",
    "publicacion.publicada",
    "publicacion.programada",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ───────────────────────────────────────────────────────
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready")

    # Kafka producer
    kafka = KafkaEventProducer()
    await kafka.start()
    _producer_mod.kafka_producer = kafka

    # Kafka consumer – subscribes to ALL business events
    consumer = KafkaEventConsumer(group_id="orchestrator-group")
    await consumer.start(topics=CONSUMED_TOPICS)
    consumer_task = asyncio.create_task(consumer.consume(handle_event))

    yield

    # ── shutdown ──────────────────────────────────────────────────────
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    await consumer.stop()
    await kafka.stop()
    _producer_mod.kafka_producer = None
    await engine.dispose()
    tracer_provider.shutdown()


app = FastAPI(
    title="n8n Orchestrator API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FastAPIInstrumentor.instrument_app(app)


@app.middleware("http")
async def trace_id_middleware(request: Request, call_next):
    response = await call_next(request)
    span = trace.get_current_span()
    if span and span.get_span_context().trace_id:
        response.headers["X-Trace-Id"] = format(
            span.get_span_context().trace_id, "032x"
        )
    return response


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(health_router)
app.include_router(workflows_router)
app.include_router(notifications_router)
