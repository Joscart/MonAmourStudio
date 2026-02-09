import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Campana(Base):
    __tablename__ = "campanas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    mensaje_global: Mapped[str] = mapped_column(Text, nullable=False)
    segmentacion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fecha_inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    fecha_fin: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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

    publicaciones: Mapped[list["Publicacion"]] = relationship(
        back_populates="campana",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Campana {self.id} titulo={self.titulo!r}>"


class Publicacion(Base):
    __tablename__ = "publicaciones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campana_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campanas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo_media: Mapped[str] = mapped_column(String(50), nullable=False)
    media_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    caption: Mapped[str] = mapped_column(Text, nullable=False)
    canal: Mapped[str] = mapped_column(String(100), nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    publicada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    campana: Mapped["Campana"] = relationship(back_populates="publicaciones")

    def __repr__(self) -> str:
        return f"<Publicacion {self.id} canal={self.canal!r}>"
