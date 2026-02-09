-- ============================================================================
-- Pedidos microservice – initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── pedidos ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedidos (
    id                   UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id           UUID            NOT NULL,
    fecha_creacion       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    estado               VARCHAR(50)     NOT NULL DEFAULT 'pendiente',
    subtotal             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    shipping             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    total                NUMERIC(12,2)   NOT NULL DEFAULT 0,
    direccion_entrega    VARCHAR(500)    NOT NULL,
    coordenadas_entrega  VARCHAR(100),
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON pedidos (estado);

-- ── pedido_items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedido_items (
    id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id        UUID            NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
    producto_id      UUID            NOT NULL,
    variante         VARCHAR(100),
    cantidad         INTEGER         NOT NULL,
    precio_unitario  NUMERIC(12,2)   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items (pedido_id);

-- ── pedido_eventos (idempotency tracking) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedido_eventos (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id   UUID            NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
    event_id    VARCHAR(255)    NOT NULL UNIQUE,
    evento      VARCHAR(100)    NOT NULL,
    payload     JSONB           NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_eventos_pedido_id ON pedido_eventos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_eventos_event_id  ON pedido_eventos (event_id);
