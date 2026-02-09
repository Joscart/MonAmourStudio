import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConfiguracionTienda
from app.repositories.tienda import TiendaRepository
from app.schemas import ConfiguracionTiendaUpdate

logger = logging.getLogger(__name__)


class TiendaService:
    """Business-logic layer for store configuration."""

    def __init__(self) -> None:
        self.repo = TiendaRepository()

    async def get_config(self, db: AsyncSession) -> Optional[ConfiguracionTienda]:
        return await self.repo.get(db)

    async def update_config(
        self, db: AsyncSession, data: ConfiguracionTiendaUpdate
    ) -> ConfiguracionTienda:
        values = data.model_dump(exclude_unset=True)
        values["updated_at"] = datetime.now(timezone.utc)
        config = await self.repo.upsert(db, values)
        logger.info("Store config updated")
        return config
