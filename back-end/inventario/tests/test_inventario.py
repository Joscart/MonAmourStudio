"""Tests unitarios para el microservicio Inventario."""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas import ProductoCreate, ProductoUpdate


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def sample_product_data():
    return ProductoCreate(
        sku="FRAME-001",
        nombre="Marco Romance Dorado",
        descripcion="Marco premium dorado",
        precio=Decimal("89.00"),
        moneda="USD",
        stock=50,
    )


@pytest.fixture
def sample_product():
    product = MagicMock()
    product.id = uuid.uuid4()
    product.sku = "FRAME-001"
    product.nombre = "Marco Romance Dorado"
    product.descripcion = "Marco premium dorado"
    product.precio = Decimal("89.00")
    product.moneda = "USD"
    product.stock = 50
    product.imagen_url = None
    return product


# ── Test: Crear producto ───────────────────────────────────────

@pytest.mark.asyncio
async def test_create_product(mock_db, sample_product_data):
    from app.services.inventario import InventarioService

    with patch("app.services.inventario.InventarioRepository") as MockRepo:
        MockRepo.create = AsyncMock()

        with patch("app.services.inventario.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()
            result = await InventarioService.create_product(mock_db, sample_product_data)
            MockRepo.create.assert_awaited_once()


# ── Test: Listar productos ────────────────────────────────────

@pytest.mark.asyncio
async def test_list_products(mock_db, sample_product):
    from app.services.inventario import InventarioService

    with patch("app.services.inventario.InventarioRepository") as MockRepo:
        MockRepo.list_all = AsyncMock(return_value=[sample_product])

        result = await InventarioService.list_products(mock_db)
        assert len(result) == 1


# ── Test: Reservar stock ──────────────────────────────────────

@pytest.mark.asyncio
async def test_reserve_stock_success(mock_db, sample_product):
    from app.services.inventario import InventarioService

    sample_product.stock = 50

    with patch("app.services.inventario.InventarioRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_product)
        MockRepo.update_stock = AsyncMock()

        with patch("app.services.inventario.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await InventarioService.reserve_stock(
                mock_db, sample_product.id, 5, uuid.uuid4()
            )
            assert result is not None


@pytest.mark.asyncio
async def test_reserve_stock_insufficient(mock_db, sample_product):
    from app.services.inventario import InventarioService

    sample_product.stock = 2

    with patch("app.services.inventario.InventarioRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_product)

        with pytest.raises(Exception):
            await InventarioService.reserve_stock(
                mock_db, sample_product.id, 10, uuid.uuid4()
            )


# ── Test: Obtener producto ─────────────────────────────────────

@pytest.mark.asyncio
async def test_get_product(mock_db, sample_product):
    from app.services.inventario import InventarioService

    with patch("app.services.inventario.InventarioRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_product)

        result = await InventarioService.get_product(mock_db, sample_product.id)
        assert result.nombre == "Marco Romance Dorado"


@pytest.mark.asyncio
async def test_get_product_not_found(mock_db):
    from app.services.inventario import InventarioService

    with patch("app.services.inventario.InventarioRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(Exception):
            await InventarioService.get_product(mock_db, uuid.uuid4())
