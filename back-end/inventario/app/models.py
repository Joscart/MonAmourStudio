import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ── Tipos de producto (admin-managed) ────────────────────────────────────────


class TipoProducto(Base):
    __tablename__ = "tipos_producto"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Lookup: Garantía ─────────────────────────────────────────────────────────


class Garantia(Base):
    __tablename__ = "garantias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    dias: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Lookup: Empaque ──────────────────────────────────────────────────────────


class Empaque(Base):
    __tablename__ = "empaques"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Lookup: Descuento ────────────────────────────────────────────────────────


class Descuento(Base):
    __tablename__ = "descuentos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    porcentaje: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Producto ──────────────────────────────────────────────────────────────────


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=True)
    precio: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    disponibilidad: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_por_pedido: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Free shipping: NULL=no free shipping, 0=always free, >0=free above threshold
    envio_gratis_umbral: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )

    # Preview image (transparent/PNG) — if present, show customization on frontend
    imagen_preview_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Denormalized rating
    calificacion_promedio: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_resenas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # FKs to lookup tables
    tipo_producto_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tipos_producto.id", ondelete="SET NULL"),
        nullable=True,
    )
    garantia_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("garantias.id", ondelete="SET NULL"),
        nullable=True,
    )
    empaque_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("empaques.id", ondelete="SET NULL"),
        nullable=True,
    )
    descuento_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("descuentos.id", ondelete="SET NULL"),
        nullable=True,
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

    # Relationships
    reglas: Mapped[list["ReglaDisponibilidad"]] = relationship(
        back_populates="producto", cascade="all, delete-orphan"
    )
    resenas: Mapped[list["Resena"]] = relationship(
        back_populates="producto", cascade="all, delete-orphan"
    )
    tamanos: Mapped[list["Tamano"]] = relationship(
        back_populates="producto", cascade="all, delete-orphan",
        order_by="Tamano.precio_adicional",
    )
    tipo_producto: Mapped["TipoProducto | None"] = relationship()
    garantia: Mapped["Garantia | None"] = relationship()
    empaque: Mapped["Empaque | None"] = relationship()
    descuento: Mapped["Descuento | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Producto {self.sku} disponibilidad={self.disponibilidad}>"


# ── Reseña ────────────────────────────────────────────────────────────────────


class Resena(Base):
    __tablename__ = "resenas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("productos.id", ondelete="CASCADE"),
        nullable=False,
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    usuario_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    calificacion: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comentario: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    producto: Mapped["Producto"] = relationship(back_populates="resenas")


# ── Tamaño (size variants per product) ────────────────────────────────────────


class Tamano(Base):
    __tablename__ = "tamanos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("productos.id", ondelete="CASCADE"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(20), nullable=False)
    ancho_cm: Mapped[float] = mapped_column(Float, nullable=False)
    alto_cm: Mapped[float] = mapped_column(Float, nullable=False)
    precio_adicional: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )

    producto: Mapped["Producto"] = relationship(back_populates="tamanos")

    def __repr__(self) -> str:
        return f"<Tamano {self.nombre} {self.ancho_cm}x{self.alto_cm}cm>"


# ── Regla de Disponibilidad ───────────────────────────────────────────────────


class ReglaDisponibilidad(Base):
    __tablename__ = "reglas_disponibilidad"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("productos.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    limite_por_pedido: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    ventana_inicio: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ventana_fin: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    producto: Mapped["Producto"] = relationship(back_populates="reglas")

    def __repr__(self) -> str:
        return f"<ReglaDisponibilidad {self.tipo} producto={self.producto_id}>"
