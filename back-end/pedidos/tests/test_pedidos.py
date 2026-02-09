"""Tests unitarios para el microservicio Pedidos."""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas import PedidoCreate, PedidoItemCreate


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def sample_order_data():
    return PedidoCreate(
        usuario_id=uuid.uuid4(),
        items=[
            PedidoItemCreate(
                producto_id=uuid.uuid4(),
                cantidad=2,
                precio_unitario=Decimal("89.00"),
            ),
            PedidoItemCreate(
                producto_id=uuid.uuid4(),
                cantidad=1,
                precio_unitario=Decimal("125.00"),
            ),
        ],
        direccion_entrega="Av. Amazonas N32-45, Quito",
    )


@pytest.fixture
def sample_order():
    order = MagicMock()
    order.id = uuid.uuid4()
    order.usuario_id = uuid.uuid4()
    order.estado = "pendiente"
    order.subtotal = Decimal("303.00")
    order.shipping = Decimal("5.00")
    order.total = Decimal("308.00")
    order.direccion_entrega = "Av. Amazonas N32-45, Quito"
    order.items = []
    return order


# ── Test: Crear pedido ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_order(mock_db, sample_order_data):
    from app.services.pedidos import PedidoService

    with patch("app.services.pedidos.PedidoRepository") as MockRepo:
        MockRepo.create = AsyncMock()

        with patch("app.services.pedidos.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await PedidoService.create_order(mock_db, sample_order_data)
            MockRepo.create.assert_awaited_once()


# ── Test: Obtener pedido ───────────────────────────────────────

@pytest.mark.asyncio
async def test_get_order(mock_db, sample_order):
    from app.services.pedidos import PedidoService

    with patch("app.services.pedidos.PedidoRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_order)

        result = await PedidoService.get_order(mock_db, sample_order.id)
        assert result.estado == "pendiente"


@pytest.mark.asyncio
async def test_get_order_not_found(mock_db):
    from app.services.pedidos import PedidoService

    with patch("app.services.pedidos.PedidoRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(Exception):
            await PedidoService.get_order(mock_db, uuid.uuid4())


# ── Test: Actualizar estado ────────────────────────────────────

@pytest.mark.asyncio
async def test_update_order_status(mock_db, sample_order):
    from app.services.pedidos import PedidoService

    with patch("app.services.pedidos.PedidoRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_order)
        MockRepo.update_status = AsyncMock()

        result = await PedidoService.update_status(mock_db, sample_order.id, "procesando")
        MockRepo.update_status.assert_awaited_once()


# ── Test: Procesar pago ────────────────────────────────────────

@pytest.mark.asyncio
async def test_process_payment_success(mock_db, sample_order):
    from app.services.pedidos import PedidoService
    from app.schemas import PagoRequest

    pago = PagoRequest(
        pedido_id=sample_order.id,
        monto=Decimal("308.00"),
    )

    with patch("app.services.pedidos.PedidoRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_order)
        MockRepo.update_status = AsyncMock()
        MockRepo.record_event = AsyncMock()

        with patch("app.services.pedidos.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await PedidoService.process_payment(mock_db, sample_order.id, pago)
            mock_producer.publish.assert_awaited()


# ── Test: Listar pedidos ──────────────────────────────────────

@pytest.mark.asyncio
async def test_list_orders(mock_db, sample_order):
    from app.services.pedidos import PedidoService

    with patch("app.services.pedidos.PedidoRepository") as MockRepo:
        MockRepo.list_by_user = AsyncMock(return_value=[sample_order])

        result = await PedidoService.list_orders(mock_db)
        assert len(result) == 1
