import uuid
from typing import Any, Optional

from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConfiguracionTienda


class TiendaRepository:
    """Data-access layer for the singleton store configuration."""

    async def get(self, db: AsyncSession) -> Optional[ConfiguracionTienda]:
        result = await db.execute(select(ConfiguracionTienda))
        return result.scalars().first()

    async def upsert(
        self, db: AsyncSession, values: dict[str, Any]
    ) -> ConfiguracionTienda:
        existing = await self.get(db)
        if existing is None:
            config = ConfiguracionTienda(**values)
            db.add(config)
            await db.flush()
            await db.refresh(config)
            return config
        else:
            stmt = (
                sa_update(ConfiguracionTienda)
                .where(ConfiguracionTienda.id == existing.id)
                .values(**values)
            )
            await db.execute(stmt)
            await db.flush()
            # Re-fetch to get updated values
            result = await db.execute(
                select(ConfiguracionTienda).where(
                    ConfiguracionTienda.id == existing.id
                )
            )
            return result.scalars().first()  # type: ignore[return-value]
