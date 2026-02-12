-- ============================================================================
-- n8n-orchestrator microservice – initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── workflow_registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_registry (
    id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    n8n_workflow_id   VARCHAR(100)    UNIQUE,
    name              VARCHAR(255)    NOT NULL,
    description       TEXT,
    trigger_event     VARCHAR(100)    NOT NULL,
    webhook_path      VARCHAR(500),
    active            BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_trigger_event ON workflow_registry (trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_active        ON workflow_registry (active);

-- ── notification_preferences ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID            NOT NULL,
    nombre_admin    VARCHAR(255)    NOT NULL,
    canal           VARCHAR(50)     NOT NULL,
    destino         VARCHAR(255)    NOT NULL,
    eventos         JSONB           NOT NULL DEFAULT '[]'::JSONB,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_usuario_id ON notification_preferences (usuario_id);
CREATE INDEX IF NOT EXISTS idx_notif_pref_activo     ON notification_preferences (activo);
