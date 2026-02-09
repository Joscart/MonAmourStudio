-- ============================================================================
-- Usuarios microservice – initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── usuarios ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre        VARCHAR(120)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,
    rol           VARCHAR(30)   NOT NULL DEFAULT 'cliente',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- ── sesiones ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sesiones (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token       TEXT        NOT NULL,
    expira      TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token       ON sesiones (token);
