import uuid
from typing import Optional

from sqlalchemy import delete as sa_delete, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Direccion, MetodoPago, Usuario


class UsuarioRepository:
    """Data-access layer – all DB queries for the Usuario entity."""

    async def create(self, db: AsyncSession, usuario: Usuario) -> Usuario:
        db.add(usuario)
        await db.flush()
        await db.refresh(usuario)
        return usuario

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Usuario]:
        result = await db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalars().first()

    async def get_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[Usuario]:
        result = await db.execute(select(Usuario).where(Usuario.id == user_id))
        return result.scalars().first()

    async def update(
        self, db: AsyncSession, user_id: uuid.UUID, data: dict
    ) -> Optional[Usuario]:
        stmt = (
            sa_update(Usuario)
            .where(Usuario.id == user_id)
            .values(**data)
            .returning(Usuario)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
        return row

    async def list_all(self, db: AsyncSession) -> list[Usuario]:
        result = await db.execute(select(Usuario).order_by(Usuario.created_at.desc()))
        return list(result.scalars().all())

    async def delete(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        result = await db.execute(
            sa_delete(Usuario).where(Usuario.id == user_id)
        )
        await db.flush()
        return result.rowcount > 0


# ── Direcciones ───────────────────────────────────────────────────────────────


class DireccionRepository:
    async def create(self, db: AsyncSession, direccion: Direccion) -> Direccion:
        db.add(direccion)
        await db.flush()
        await db.refresh(direccion)
        return direccion

    async def list_by_user(self, db: AsyncSession, user_id: uuid.UUID) -> list[Direccion]:
        result = await db.execute(
            select(Direccion)
            .where(Direccion.usuario_id == user_id)
            .order_by(Direccion.es_principal.desc(), Direccion.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, direccion_id: uuid.UUID) -> Optional[Direccion]:
        result = await db.execute(select(Direccion).where(Direccion.id == direccion_id))
        return result.scalars().first()

    async def update(self, db: AsyncSession, direccion_id: uuid.UUID, data: dict) -> Optional[Direccion]:
        stmt = (
            sa_update(Direccion)
            .where(Direccion.id == direccion_id)
            .values(**data)
            .returning(Direccion)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
        return row

    async def delete(self, db: AsyncSession, direccion_id: uuid.UUID) -> bool:
        result = await db.execute(sa_delete(Direccion).where(Direccion.id == direccion_id))
        await db.flush()
        return result.rowcount > 0

    async def clear_principal(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        """Set es_principal=False for all addresses of a user."""
        await db.execute(
            sa_update(Direccion)
            .where(Direccion.usuario_id == user_id)
            .values(es_principal=False)
        )
        await db.flush()


# ── Métodos de Pago ───────────────────────────────────────────────────────────


class MetodoPagoRepository:
    async def create(self, db: AsyncSession, metodo: MetodoPago) -> MetodoPago:
        db.add(metodo)
        await db.flush()
        await db.refresh(metodo)
        return metodo

    async def list_by_user(self, db: AsyncSession, user_id: uuid.UUID) -> list[MetodoPago]:
        result = await db.execute(
            select(MetodoPago)
            .where(MetodoPago.usuario_id == user_id)
            .order_by(MetodoPago.es_principal.desc(), MetodoPago.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, metodo_id: uuid.UUID) -> Optional[MetodoPago]:
        result = await db.execute(select(MetodoPago).where(MetodoPago.id == metodo_id))
        return result.scalars().first()

    async def update(self, db: AsyncSession, metodo_id: uuid.UUID, data: dict) -> Optional[MetodoPago]:
        stmt = (
            sa_update(MetodoPago)
            .where(MetodoPago.id == metodo_id)
            .values(**data)
            .returning(MetodoPago)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is not None:
            await db.flush()
        return row

    async def delete(self, db: AsyncSession, metodo_id: uuid.UUID) -> bool:
        result = await db.execute(sa_delete(MetodoPago).where(MetodoPago.id == metodo_id))
        await db.flush()
        return result.rowcount > 0

    async def clear_principal(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        await db.execute(
            sa_update(MetodoPago)
            .where(MetodoPago.usuario_id == user_id)
            .values(es_principal=False)
        )
        await db.flush()
