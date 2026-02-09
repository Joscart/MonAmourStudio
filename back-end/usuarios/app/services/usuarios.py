import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Usuario
from app.repositories.usuarios import UsuarioRepository
from app.schemas import UsuarioCreate, UsuarioUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UsuarioService:
    """Business-logic layer for user management."""

    def __init__(self) -> None:
        self.repo = UsuarioRepository()

    # ── helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def _verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def _create_jwt(user_id: uuid.UUID, rol: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_EXPIRATION_MINUTES
        )
        payload = {
            "sub": str(user_id),
            "rol": rol,
            "exp": expire,
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    # ── public API ────────────────────────────────────────────────────

    async def register(self, db: AsyncSession, data: UsuarioCreate) -> Usuario:
        """Register a new user, publish Kafka event, return the user."""
        existing = await self.repo.get_by_email(db, data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado",
            )

        usuario = Usuario(
            nombre=data.nombre,
            email=data.email,
            password_hash=self._hash_password(data.password),
        )
        usuario = await self.repo.create(db, usuario)

        # publish domain event (best-effort; import here to avoid circular dep)
        try:
            from app.events.producer import kafka_producer

            if kafka_producer is not None:
                await kafka_producer.publish(
                    topic="usuarios",
                    key=str(usuario.id),
                    value={
                        "event": "user_registered",
                        "user_id": str(usuario.id),
                        "email": usuario.email,
                        "nombre": usuario.nombre,
                    },
                )
        except Exception:
            pass  # don't fail registration if Kafka is unavailable

        return usuario

    async def authenticate(self, db: AsyncSession, email: str, password: str) -> str:
        """Verify credentials and return a JWT token."""
        user = await self.repo.get_by_email(db, email)
        if user is None or not self._verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )
        return self._create_jwt(user.id, user.rol)

    async def get_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[Usuario]:
        return await self.repo.get_by_id(db, user_id)

    async def update_profile(
        self, db: AsyncSession, user_id: uuid.UUID, data: UsuarioUpdate
    ) -> Optional[Usuario]:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.repo.get_by_id(db, user_id)
        return await self.repo.update(db, user_id, update_data)

    async def list_users(self, db: AsyncSession) -> list[Usuario]:
        return await self.repo.list_all(db)

    async def delete_user(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        return await self.repo.delete(db, user_id)
