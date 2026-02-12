"""
Kafka event handlers for the orchestrator.

These handlers are invoked by the consumer and dispatch events to n8n workflows.
The main events we care about:
  - order.created          → notify admins via WhatsApp, trigger order orchestration
  - payment.succeeded      → trigger delivery scheduling
  - stock.released         → check low-stock alerts
  - entrega.programada     → notify client
  - campana.activada       → trigger campaign execution
"""

import logging
from typing import Any

from app.database import async_session
from app.n8n_client import n8n_client
from app.repositories.notifications import NotificationPreferenceRepository
from app.repositories.workflows import WorkflowRepository

logger = logging.getLogger(__name__)

_wf_repo = WorkflowRepository()
_notif_repo = NotificationPreferenceRepository()


async def _dispatch_to_n8n(event_type: str, payload: dict[str, Any]) -> None:
    """Look up registered workflows for this event type and trigger them."""
    async with async_session() as db:
        # 1. Trigger registered workflows
        workflows = await _wf_repo.get_by_event(db, event_type)
        for wf in workflows:
            if not wf.webhook_path:
                continue
            try:
                await n8n_client.trigger_webhook(wf.webhook_path, payload)
                logger.info(
                    "Triggered n8n workflow '%s' (%s) for event %s",
                    wf.name,
                    wf.webhook_path,
                    event_type,
                )
            except Exception as exc:
                logger.error(
                    "Failed to trigger workflow '%s': %s", wf.name, exc
                )

        # 2. Send notifications to admins who subscribed to this event
        prefs = await _notif_repo.list_active_for_event(db, event_type)
        for pref in prefs:
            notification_payload = {
                "event_type": event_type,
                "canal": pref.canal,
                "destino": pref.destino,
                "nombre_admin": pref.nombre_admin,
                "payload": payload,
            }
            try:
                await n8n_client.trigger_webhook(
                    "notification-dispatcher", notification_payload
                )
                logger.info(
                    "Notified %s via %s for %s",
                    pref.nombre_admin,
                    pref.canal,
                    event_type,
                )
            except Exception as exc:
                logger.error(
                    "Failed to notify %s: %s", pref.nombre_admin, exc
                )


async def handle_event(payload: dict[str, Any]) -> None:
    """Central dispatcher – routes every Kafka message to n8n."""
    event_type = payload.get("event", "")
    if not event_type:
        logger.debug("Received message without 'event' field – skipping")
        return

    logger.info("Processing event: %s", event_type)
    await _dispatch_to_n8n(event_type, payload)
