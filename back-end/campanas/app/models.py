import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
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


class ConfiguracionTienda(Base):
    __tablename__ = "configuracion_tienda"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_contacto: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_soporte: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefono_contacto: Mapped[str | None] = mapped_column(String(50), nullable=True)
    telefono_soporte: Mapped[str | None] = mapped_column(String(50), nullable=True)
    envio_gratis_desde: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    costo_envio: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tiktok_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    whatsapp_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color_primary_h: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=340
    )
    color_primary_s: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=60
    )
    color_primary_l: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=65
    )
    color_accent_h: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=38
    )
    color_accent_s: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=70
    )
    color_accent_l: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=50
    )
    color_secondary_h: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=220
    )
    color_secondary_s: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=60
    )
    color_secondary_l: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=50
    )
    atenuacion: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=10
    )
    home_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    login_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    register_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    about_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    footer_light_text: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=True
    )
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
        return f"<ConfiguracionTienda {self.id}>"
