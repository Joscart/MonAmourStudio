import uuid
from typing import Optional

from sqlalchemy import delete as sa_delete, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Usuario


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
