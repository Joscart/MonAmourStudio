import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
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
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
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

    reglas: Mapped[list["ReglaDisponibilidad"]] = relationship(
        back_populates="producto", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Producto {self.sku} stock={self.stock}>"


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
