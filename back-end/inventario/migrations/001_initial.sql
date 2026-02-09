-- ============================================================================
-- Inventario microservice – initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── productos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS productos (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku         VARCHAR(80)     NOT NULL UNIQUE,
    nombre      VARCHAR(255)    NOT NULL,
    descripcion TEXT,
    precio      NUMERIC(10,2)   NOT NULL,
    moneda      VARCHAR(10)     NOT NULL DEFAULT 'USD',
    stock       INTEGER         NOT NULL DEFAULT 0,
    imagen_url  VARCHAR(500),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos (sku);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos USING gin (nombre gin_trgm_ops);

-- ── reglas_disponibilidad ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reglas_disponibilidad (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id         UUID        NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
    tipo                VARCHAR(50) NOT NULL,
    limite_por_pedido   INTEGER     NOT NULL DEFAULT 1,
    ventana_inicio      TIMESTAMPTZ,
    ventana_fin         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reglas_producto_id ON reglas_disponibilidad (producto_id);
