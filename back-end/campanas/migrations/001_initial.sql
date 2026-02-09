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

-- ── configuracion_tienda (singleton – store settings) ────────────────────────

CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    logo_url            VARCHAR(500),
    email_contacto      VARCHAR(255),
    email_soporte       VARCHAR(255),
    telefono_contacto   VARCHAR(50),
    telefono_soporte    VARCHAR(50),
    envio_gratis_desde  NUMERIC(10,2),
    costo_envio         NUMERIC(10,2),
    instagram_url       VARCHAR(500),
    tiktok_url          VARCHAR(500),
    whatsapp_url        VARCHAR(500),
    color_primary_h     INTEGER         DEFAULT 340,
    color_primary_s     INTEGER         DEFAULT 60,
    color_primary_l     INTEGER         DEFAULT 65,
    color_accent_h      INTEGER         DEFAULT 38,
    color_accent_s      INTEGER         DEFAULT 70,
    color_accent_l      INTEGER         DEFAULT 50,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
