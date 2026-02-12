import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class WorkflowRegistry(Base):
    """Maps Kafka events to n8n workflows/webhooks."""

    __tablename__ = "workflow_registry"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    n8n_workflow_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_event: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    webhook_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<WorkflowRegistry {self.name!r} event={self.trigger_event!r}>"


class NotificationPreference(Base):
    """Admin notification preferences – which events to receive and via which channel."""

    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    nombre_admin: Mapped[str] = mapped_column(String(255), nullable=False)
    canal: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # whatsapp | email
    destino: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # phone number or email
    eventos: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=list
    )  # e.g. ["order.created", "stock.low"]
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<NotificationPreference {self.nombre_admin!r} canal={self.canal!r}>"
