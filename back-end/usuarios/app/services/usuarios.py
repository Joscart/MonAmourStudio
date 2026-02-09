import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Direccion, MetodoPago, Usuario
from app.repositories.usuarios import DireccionRepository, MetodoPagoRepository, UsuarioRepository
from app.schemas import (
    DireccionCreate,
    DireccionUpdate,
    MetodoPagoCreate,
    PasswordChange,
    UsuarioCreate,
    UsuarioUpdate,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UsuarioService:
    """Business-logic layer for user management."""

    def __init__(self) -> None:
        self.repo = UsuarioRepository()
        self.dir_repo = DireccionRepository()
        self.pago_repo = MetodoPagoRepository()

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

    @staticmethod
    def is_default_admin(email: str) -> bool:
        """Check if this email is the env-var default admin."""
        return bool(settings.ADMIN_EMAIL) and email.lower() == settings.ADMIN_EMAIL.lower()

    # ── public API ────────────────────────────────────────────────────

    async def register(self, db: AsyncSession, data: UsuarioCreate) -> Usuario:
        existing = await self.repo.get_by_email(db, data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado",
            )

        rol = "cliente"
        if self.is_default_admin(data.email):
            rol = "admin"

        usuario = Usuario(
            nombre=data.nombre,
            email=data.email,
            password_hash=self._hash_password(data.password),
            rol=rol,
        )
        usuario = await self.repo.create(db, usuario)

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
            pass

        return usuario

    async def authenticate(self, db: AsyncSession, email: str, password: str) -> str:
        user = await self.repo.get_by_email(db, email)
        if user is None or not self._verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )
        return self._create_jwt(user.id, user.rol)

    async def authenticate_google(self, db: AsyncSession, id_token_str: str) -> str:
        """Verify a Google ID token and return a JWT for the user."""
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Google OAuth no está configurado",
            )
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            idinfo = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de Google inválido",
            )

        email = idinfo.get("email")
        name = idinfo.get("name", "Usuario")
        picture = idinfo.get("picture")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email no disponible en el token de Google",
            )

        # Find existing user or create a new one
        user = await self.repo.get_by_email(db, email)
        if user is None:
            rol = "admin" if self.is_default_admin(email) else "cliente"
            user = Usuario(
                nombre=name,
                email=email,
                password_hash=self._hash_password(secrets.token_urlsafe(32)),
                rol=rol,
                foto_url=picture,
            )
            user = await self.repo.create(db, user)

            try:
                from app.events.producer import kafka_producer
                if kafka_producer is not None:
                    await kafka_producer.publish(
                        topic="usuarios",
                        key=str(user.id),
                        value={
                            "event": "user_registered",
                            "user_id": str(user.id),
                            "email": user.email,
                            "nombre": user.nombre,
                            "provider": "google",
                        },
                    )
            except Exception:
                pass
        else:
            # Update name/photo from Google if not already set
            updates: dict = {}
            if not user.foto_url and picture:
                updates["foto_url"] = picture
            if updates:
                await self.repo.update(db, user.id, updates)
                user = await self.repo.get_by_id(db, user.id)  # type: ignore

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

    async def change_password(
        self, db: AsyncSession, user_id: uuid.UUID, data: PasswordChange
    ) -> bool:
        user = await self.repo.get_by_id(db, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if not self._verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        new_hash = self._hash_password(data.new_password)
        await self.repo.update(db, user_id, {"password_hash": new_hash})
        return True

    async def delete_own_account(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        user = await self.repo.get_by_id(db, user_id)
        if user is None:
            return False
        if self.is_default_admin(user.email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta de administrador principal no puede eliminarse",
            )
        return await self.repo.delete(db, user_id)

    async def list_users(self, db: AsyncSession) -> list[Usuario]:
        return await self.repo.list_all(db)

    async def update_role(
        self, db: AsyncSession, user_id: uuid.UUID, new_role: str
    ) -> Optional[Usuario]:
        user = await self.repo.get_by_id(db, user_id)
        if user is None:
            return None
        if self.is_default_admin(user.email) and new_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El administrador principal no puede cambiar de rol",
            )
        return await self.repo.update(db, user_id, {"rol": new_role})

    async def delete_user(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        user = await self.repo.get_by_id(db, user_id)
        if user and self.is_default_admin(user.email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta de administrador principal no puede eliminarse",
            )
        return await self.repo.delete(db, user_id)

    # ══════════════════════════════════════════════════════════════════
    #  Direcciones
    # ══════════════════════════════════════════════════════════════════

    async def list_direcciones(self, db: AsyncSession, user_id: uuid.UUID) -> list[Direccion]:
        return await self.dir_repo.list_by_user(db, user_id)

    async def create_direccion(
        self, db: AsyncSession, user_id: uuid.UUID, data: DireccionCreate
    ) -> Direccion:
        if data.es_principal:
            await self.dir_repo.clear_principal(db, user_id)
        d = Direccion(
            usuario_id=user_id,
            etiqueta=data.etiqueta,
            linea1=data.linea1,
            linea2=data.linea2,
            ciudad=data.ciudad,
            provincia=data.provincia,
            codigo_postal=data.codigo_postal,
            pais=data.pais,
            es_principal=data.es_principal,
        )
        return await self.dir_repo.create(db, d)

    async def update_direccion(
        self, db: AsyncSession, user_id: uuid.UUID, direccion_id: uuid.UUID, data: DireccionUpdate
    ) -> Optional[Direccion]:
        existing = await self.dir_repo.get_by_id(db, direccion_id)
        if existing is None or existing.usuario_id != user_id:
            return None
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return existing
        if update_data.get("es_principal"):
            await self.dir_repo.clear_principal(db, user_id)
        return await self.dir_repo.update(db, direccion_id, update_data)

    async def delete_direccion(
        self, db: AsyncSession, user_id: uuid.UUID, direccion_id: uuid.UUID
    ) -> bool:
        existing = await self.dir_repo.get_by_id(db, direccion_id)
        if existing is None or existing.usuario_id != user_id:
            return False
        return await self.dir_repo.delete(db, direccion_id)

    # ══════════════════════════════════════════════════════════════════
    #  Métodos de Pago
    # ══════════════════════════════════════════════════════════════════

    async def list_metodos_pago(self, db: AsyncSession, user_id: uuid.UUID) -> list[MetodoPago]:
        return await self.pago_repo.list_by_user(db, user_id)

    async def create_metodo_pago(
        self, db: AsyncSession, user_id: uuid.UUID, data: MetodoPagoCreate
    ) -> MetodoPago:
        if data.es_principal:
            await self.pago_repo.clear_principal(db, user_id)
        m = MetodoPago(
            usuario_id=user_id,
            tipo=data.tipo,
            ultimos_4=data.ultimos_4,
            titular=data.titular,
            expiracion=data.expiracion,
            es_principal=data.es_principal,
        )
        return await self.pago_repo.create(db, m)

    async def delete_metodo_pago(
        self, db: AsyncSession, user_id: uuid.UUID, metodo_id: uuid.UUID
    ) -> bool:
        existing = await self.pago_repo.get_by_id(db, metodo_id)
        if existing is None or existing.usuario_id != user_id:
            return False
        return await self.pago_repo.delete(db, metodo_id)
