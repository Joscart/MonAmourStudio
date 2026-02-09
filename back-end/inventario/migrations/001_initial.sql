-- ============================================================================
-- Inventario microservice – initial schema  (v2 – with lookup tables)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Lookup: tipos_producto ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tipos_producto (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(120)    NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ── Lookup: garantías ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS garantias (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(120)    NOT NULL UNIQUE,
    dias        INTEGER         NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ── Lookup: empaques ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS empaques (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(120)    NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ── Lookup: descuentos ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS descuentos (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(120)    NOT NULL UNIQUE,
    porcentaje  DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ── productos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS productos (
    id                      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku                     VARCHAR(80)     NOT NULL UNIQUE,
    nombre                  VARCHAR(255)    NOT NULL,
    descripcion             TEXT,
    precio                  NUMERIC(10,2)   NOT NULL,
    moneda                  VARCHAR(10)     NOT NULL DEFAULT 'USD',
    disponibilidad          INTEGER         NOT NULL DEFAULT 0,
    max_por_pedido          INTEGER         NOT NULL DEFAULT 1,
    imagen_url              VARCHAR(500),
    envio_gratis_umbral     NUMERIC(10,2),
    imagen_preview_url      VARCHAR(500),
    calificacion_promedio   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_resenas           INTEGER         NOT NULL DEFAULT 0,
    tipo_producto_id        UUID            REFERENCES tipos_producto(id) ON DELETE SET NULL,
    garantia_id             UUID            REFERENCES garantias(id) ON DELETE SET NULL,
    empaque_id              UUID            REFERENCES empaques(id) ON DELETE SET NULL,
    descuento_id            UUID            REFERENCES descuentos(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos (sku);

-- ── reseñas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resenas (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id     UUID            NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    usuario_id      UUID            NOT NULL,
    usuario_nombre  VARCHAR(255)    NOT NULL,
    calificacion    INTEGER         NOT NULL,
    comentario      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resenas_producto ON resenas (producto_id);

-- ── tamaños (per-product size variants) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS tamanos (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id         UUID            NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre              VARCHAR(20)     NOT NULL,
    ancho_cm            DOUBLE PRECISION NOT NULL,
    alto_cm             DOUBLE PRECISION NOT NULL,
    precio_adicional    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    UNIQUE(producto_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_tamanos_producto ON tamanos (producto_id);

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
