"""Tests unitarios para el microservicio Entregas."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas import EntregaCreate, EntregaUpdateEstado, EntregaReagendar


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def sample_delivery_data():
    return EntregaCreate(
        pedido_id=uuid.uuid4(),
        direccion="Av. Amazonas N32-45, Quito",
        fecha_programada=datetime.now(timezone.utc) + timedelta(days=3),
    )


@pytest.fixture
def sample_delivery():
    delivery = MagicMock()
    delivery.id = uuid.uuid4()
    delivery.pedido_id = uuid.uuid4()
    delivery.estado = "programada"
    delivery.guia = "MA-12345678"
    delivery.fecha_programada = datetime.now(timezone.utc) + timedelta(days=3)
    delivery.fecha_entrega = None
    delivery.direccion = "Av. Amazonas N32-45, Quito"
    delivery.notas = None
    return delivery


# ── Test: Crear entrega ────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_delivery(mock_db, sample_delivery_data):
    from app.services.entregas import EntregaService

    with patch("app.services.entregas.EntregaRepository") as MockRepo:
        MockRepo.create = AsyncMock()

        with patch("app.services.entregas.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await EntregaService.create_delivery(mock_db, sample_delivery_data)
            MockRepo.create.assert_awaited_once()


# ── Test: Obtener entrega ──────────────────────────────────────

@pytest.mark.asyncio
async def test_get_delivery(mock_db, sample_delivery):
    from app.services.entregas import EntregaService

    with patch("app.services.entregas.EntregaRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_delivery)

        result = await EntregaService.get_delivery(mock_db, sample_delivery.id)
        assert result.estado == "programada"
        assert result.guia == "MA-12345678"


@pytest.mark.asyncio
async def test_get_delivery_not_found(mock_db):
    from app.services.entregas import EntregaService

    with patch("app.services.entregas.EntregaRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(Exception):
            await EntregaService.get_delivery(mock_db, uuid.uuid4())


# ── Test: Actualizar estado ────────────────────────────────────

@pytest.mark.asyncio
async def test_update_delivery_status(mock_db, sample_delivery):
    from app.services.entregas import EntregaService

    update_data = EntregaUpdateEstado(estado="en_camino", notas="Salió del almacén")

    with patch("app.services.entregas.EntregaRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_delivery)
        MockRepo.update_status = AsyncMock()
        MockRepo.record_event = AsyncMock()

        with patch("app.services.entregas.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await EntregaService.update_status(
                mock_db, sample_delivery.id, update_data
            )
            MockRepo.update_status.assert_awaited_once()


# ── Test: Reagendar entrega ────────────────────────────────────

@pytest.mark.asyncio
async def test_reschedule_delivery(mock_db, sample_delivery):
    from app.services.entregas import EntregaService

    nueva_fecha = datetime.now(timezone.utc) + timedelta(days=5)
    reagendar_data = EntregaReagendar(fecha_programada=nueva_fecha)

    with patch("app.services.entregas.EntregaRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_delivery)
        MockRepo.reschedule = AsyncMock()

        result = await EntregaService.reschedule(
            mock_db, sample_delivery.id, reagendar_data
        )
        MockRepo.reschedule.assert_awaited_once()


# ── Test: Listar entregas ─────────────────────────────────────

@pytest.mark.asyncio
async def test_list_deliveries(mock_db, sample_delivery):
    from app.services.entregas import EntregaService

    with patch("app.services.entregas.EntregaRepository") as MockRepo:
        MockRepo.list_all = AsyncMock(return_value=[sample_delivery])

        result = await EntregaService.list_deliveries(mock_db)
        assert len(result) == 1
