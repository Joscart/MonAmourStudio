"""Tests unitarios para el microservicio Campañas."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas import CampanaCreate, PublicacionCreate


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def sample_campaign_data():
    return CampanaCreate(
        titulo="Campaña San Valentín",
        mensaje_global="Celebra el amor con marcos premium",
        segmentacion="todos",
        fecha_inicio=datetime.now(timezone.utc),
        fecha_fin=datetime.now(timezone.utc) + timedelta(days=14),
    )


@pytest.fixture
def sample_campaign():
    campaign = MagicMock()
    campaign.id = uuid.uuid4()
    campaign.titulo = "Campaña San Valentín"
    campaign.mensaje_global = "Celebra el amor con marcos premium"
    campaign.segmentacion = "todos"
    campaign.activa = False
    campaign.publicaciones = []
    return campaign


@pytest.fixture
def sample_publication_data(sample_campaign):
    return PublicacionCreate(
        campana_id=sample_campaign.id,
        tipo_media="imagen",
        media_url="https://example.com/promo.jpg",
        caption="¡Oferta especial por San Valentín!",
        canal="instagram",
    )


@pytest.fixture
def sample_publication(sample_campaign):
    pub = MagicMock()
    pub.id = uuid.uuid4()
    pub.campana_id = sample_campaign.id
    pub.tipo_media = "imagen"
    pub.media_url = "https://example.com/promo.jpg"
    pub.caption = "¡Oferta especial!"
    pub.canal = "instagram"
    pub.publicada = False
    pub.scheduled_at = None
    return pub


# ── Test: Crear campaña ────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_campaign(mock_db, sample_campaign_data):
    from app.services.campanas import CampanaService

    with patch("app.services.campanas.CampanaRepository") as MockRepo:
        MockRepo.create = AsyncMock()

        result = await CampanaService.create_campaign(mock_db, sample_campaign_data)
        MockRepo.create.assert_awaited_once()


# ── Test: Listar campañas ──────────────────────────────────────

@pytest.mark.asyncio
async def test_list_campaigns(mock_db, sample_campaign):
    from app.services.campanas import CampanaService

    with patch("app.services.campanas.CampanaRepository") as MockRepo:
        MockRepo.list_all = AsyncMock(return_value=[sample_campaign])

        result = await CampanaService.list_campaigns(mock_db)
        assert len(result) == 1


# ── Test: Activar campaña ──────────────────────────────────────

@pytest.mark.asyncio
async def test_activate_campaign(mock_db, sample_campaign):
    from app.services.campanas import CampanaService

    with patch("app.services.campanas.CampanaRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_campaign)
        MockRepo.update = AsyncMock()

        with patch("app.services.campanas.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await CampanaService.activate_campaign(mock_db, sample_campaign.id)
            mock_producer.publish.assert_awaited()


# ── Test: Crear publicación ────────────────────────────────────

@pytest.mark.asyncio
async def test_create_publication(mock_db, sample_publication_data):
    from app.services.publicaciones import PublicacionService

    with patch("app.services.publicaciones.PublicacionRepository") as MockRepo:
        MockRepo.create = AsyncMock()

        result = await PublicacionService.create_publication(
            mock_db, sample_publication_data
        )
        MockRepo.create.assert_awaited_once()


# ── Test: Publicar publicación ─────────────────────────────────

@pytest.mark.asyncio
async def test_publish_publication(mock_db, sample_publication):
    from app.services.publicaciones import PublicacionService

    with patch("app.services.publicaciones.PublicacionRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_publication)
        MockRepo.update = AsyncMock()

        with patch("app.services.publicaciones.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await PublicacionService.publish(mock_db, sample_publication.id)
            MockRepo.update.assert_awaited_once()
