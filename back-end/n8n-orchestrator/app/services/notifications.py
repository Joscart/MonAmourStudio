import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NotificationPreference
from app.n8n_client import n8n_client
from app.repositories.notifications import NotificationPreferenceRepository
from app.schemas import NotificationPreferenceCreate, NotificationPreferenceUpdate

logger = logging.getLogger(__name__)


class NotificationService:
    """Business-logic for admin notification preferences + dispatching."""

    def __init__(self) -> None:
        self.repo = NotificationPreferenceRepository()

    # ── CRUD ──────────────────────────────────────────────────────────

    async def create_preference(
        self, db: AsyncSession, data: NotificationPreferenceCreate
    ) -> NotificationPreference:
        pref = NotificationPreference(
            usuario_id=data.usuario_id,
            nombre_admin=data.nombre_admin,
            canal=data.canal,
            destino=data.destino,
            eventos=data.eventos,
            activo=data.activo,
        )
        pref = await self.repo.create(db, pref)
        logger.info("Notification pref created: %s → %s", pref.nombre_admin, pref.canal)
        return pref

    async def list_preferences(
        self, db: AsyncSession
    ) -> list[NotificationPreference]:
        return await self.repo.list_all(db)

    async def get_preference(
        self, db: AsyncSession, pref_id: uuid.UUID
    ) -> Optional[NotificationPreference]:
        return await self.repo.get_by_id(db, pref_id)

    async def update_preference(
        self, db: AsyncSession, pref_id: uuid.UUID, data: NotificationPreferenceUpdate
    ) -> Optional[NotificationPreference]:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.repo.get_by_id(db, pref_id)
        values["updated_at"] = datetime.now(timezone.utc)
        return await self.repo.update(db, pref_id, values)

    async def delete_preference(
        self, db: AsyncSession, pref_id: uuid.UUID
    ) -> bool:
        return await self.repo.delete(db, pref_id)

    # ── Dispatch ──────────────────────────────────────────────────────

    async def dispatch_notification(
        self,
        db: AsyncSession,
        event_type: str,
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Find all admins who want to be notified about *event_type*
        and trigger the n8n notification workflow for each."""
        prefs = await self.repo.list_active_for_event(db, event_type)
        if not prefs:
            logger.debug("No notification prefs for event %s", event_type)
            return []

        results: list[dict[str, Any]] = []
        for pref in prefs:
            notification_payload = {
                "event_type": event_type,
                "canal": pref.canal,
                "destino": pref.destino,
                "nombre_admin": pref.nombre_admin,
                "payload": payload,
            }
            try:
                resp = await n8n_client.trigger_webhook(
                    "notification-dispatcher", notification_payload
                )
                results.append(
                    {
                        "admin": pref.nombre_admin,
                        "canal": pref.canal,
                        "status": "sent",
                        "response": resp,
                    }
                )
                logger.info(
                    "Notification dispatched to %s via %s for %s",
                    pref.nombre_admin,
                    pref.canal,
                    event_type,
                )
            except Exception as exc:
                results.append(
                    {
                        "admin": pref.nombre_admin,
                        "canal": pref.canal,
                        "status": "error",
                        "error": str(exc),
                    }
                )
                logger.error(
                    "Failed to notify %s via %s: %s",
                    pref.nombre_admin,
                    pref.canal,
                    exc,
                )
        return results
