"""Tests unitarios para el microservicio Usuarios."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas import UsuarioCreate, UsuarioLogin, UsuarioUpdate


# ── Fixtures ───────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def sample_user_data():
    return UsuarioCreate(
        nombre="Test User",
        email="test@example.com",
        password="SecurePass123",
    )


@pytest.fixture
def sample_user():
    """Simula un objeto Usuario retornado de la BD."""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.nombre = "Test User"
    user.email = "test@example.com"
    user.password_hash = "$2b$12$fakehashfortest"
    user.rol = "cliente"
    return user


# ── Test: Registro de usuario ──────────────────────────────────

@pytest.mark.asyncio
async def test_register_user_success(mock_db, sample_user_data):
    from app.services.usuarios import UsuarioService

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.get_by_email = AsyncMock(return_value=None)
        MockRepo.create = AsyncMock()

        with patch("app.services.usuarios.event_producer") as mock_producer:
            mock_producer.publish = AsyncMock()

            result = await UsuarioService.register(mock_db, sample_user_data)

            MockRepo.get_by_email.assert_awaited_once_with(mock_db, "test@example.com")
            MockRepo.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_register_user_duplicate_email(mock_db, sample_user_data, sample_user):
    from app.services.usuarios import UsuarioService

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.get_by_email = AsyncMock(return_value=sample_user)

        with pytest.raises(Exception):
            await UsuarioService.register(mock_db, sample_user_data)


# ── Test: Autenticación ────────────────────────────────────────

@pytest.mark.asyncio
async def test_authenticate_success(mock_db, sample_user):
    from app.services.usuarios import UsuarioService
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    sample_user.password_hash = pwd_context.hash("SecurePass123")

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.get_by_email = AsyncMock(return_value=sample_user)

        token = await UsuarioService.authenticate(mock_db, "test@example.com", "SecurePass123")

        assert token is not None
        assert "access_token" in token or hasattr(token, "access_token")


@pytest.mark.asyncio
async def test_authenticate_wrong_password(mock_db, sample_user):
    from app.services.usuarios import UsuarioService
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    sample_user.password_hash = pwd_context.hash("CorrectPass123")

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.get_by_email = AsyncMock(return_value=sample_user)

        with pytest.raises(Exception):
            await UsuarioService.authenticate(mock_db, "test@example.com", "WrongPassword")


# ── Test: Obtener usuario por ID ───────────────────────────────

@pytest.mark.asyncio
async def test_get_user_by_id(mock_db, sample_user):
    from app.services.usuarios import UsuarioService

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=sample_user)

        result = await UsuarioService.get_by_id(mock_db, sample_user.id)

        assert result.nombre == "Test User"
        MockRepo.get_by_id.assert_awaited_once_with(mock_db, sample_user.id)


@pytest.mark.asyncio
async def test_get_user_not_found(mock_db):
    from app.services.usuarios import UsuarioService

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(Exception):
            await UsuarioService.get_by_id(mock_db, uuid.uuid4())


# ── Test: Listar usuarios ─────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users(mock_db, sample_user):
    from app.services.usuarios import UsuarioService

    with patch("app.services.usuarios.UsuarioRepository") as MockRepo:
        MockRepo.list_all = AsyncMock(return_value=[sample_user])

        result = await UsuarioService.list_users(mock_db)

        assert len(result) == 1
