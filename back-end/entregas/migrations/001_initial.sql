-- ============================================================================
-- Entregas microservice – initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── entregas ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entregas (
    id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id         UUID            NOT NULL UNIQUE,
    estado            VARCHAR(50)     NOT NULL DEFAULT 'programada',
    guia              VARCHAR(100),
    fecha_programada  TIMESTAMPTZ,
    fecha_entrega     TIMESTAMPTZ,
    direccion         VARCHAR(500)    NOT NULL,
    notas             TEXT,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entregas_pedido_id ON entregas (pedido_id);
CREATE INDEX IF NOT EXISTS idx_entregas_estado    ON entregas (estado);
CREATE INDEX IF NOT EXISTS idx_entregas_guia      ON entregas (guia);

-- ── entrega_eventos (idempotency tracking) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS entrega_eventos (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrega_id  UUID            NOT NULL REFERENCES entregas (id) ON DELETE CASCADE,
    event_id    VARCHAR(255)    NOT NULL UNIQUE,
    evento      VARCHAR(100)    NOT NULL,
    payload     JSONB           NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entrega_eventos_entrega_id ON entrega_eventos (entrega_id);
