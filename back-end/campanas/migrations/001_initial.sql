-- ============================================================================
-- Campañas microservice – initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── campanas ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campanas (
    id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo            VARCHAR(255)    NOT NULL,
    mensaje_global    TEXT            NOT NULL,
    segmentacion      VARCHAR(255),
    fecha_inicio      TIMESTAMPTZ     NOT NULL,
    fecha_fin         TIMESTAMPTZ     NOT NULL,
    activa            BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanas_activa        ON campanas (activa);
CREATE INDEX IF NOT EXISTS idx_campanas_fecha_inicio   ON campanas (fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_campanas_fecha_fin      ON campanas (fecha_fin);

-- ── publicaciones ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS publicaciones (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    campana_id      UUID            NOT NULL REFERENCES campanas (id) ON DELETE CASCADE,
    tipo_media      VARCHAR(50)     NOT NULL,
    media_url       VARCHAR(1024),
    caption         TEXT            NOT NULL,
    canal           VARCHAR(100)    NOT NULL,
    scheduled_at    TIMESTAMPTZ,
    publicada       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publicaciones_campana_id   ON publicaciones (campana_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_canal         ON publicaciones (canal);
CREATE INDEX IF NOT EXISTS idx_publicaciones_scheduled_at  ON publicaciones (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publicaciones_publicada     ON publicaciones (publicada);
