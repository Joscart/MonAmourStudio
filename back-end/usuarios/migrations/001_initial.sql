-- ============================================================================
-- Usuarios microservice – initial schema (v2 – with addresses, payment methods)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── usuarios ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre        VARCHAR(120)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,
    rol           VARCHAR(30)   NOT NULL DEFAULT 'cliente',
    telefono      VARCHAR(30),
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

-- ── direcciones ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS direcciones (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    etiqueta        VARCHAR(60)     NOT NULL DEFAULT 'Casa',
    linea1          VARCHAR(255)    NOT NULL,
    linea2          VARCHAR(255),
    ciudad          VARCHAR(120)    NOT NULL,
    provincia       VARCHAR(120)    NOT NULL,
    codigo_postal   VARCHAR(20)     NOT NULL,
    pais            VARCHAR(60)     NOT NULL DEFAULT 'Ecuador',
    es_principal    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones (usuario_id);

-- ── métodos de pago ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metodos_pago (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo            VARCHAR(30)     NOT NULL DEFAULT 'Visa',
    ultimos_4       VARCHAR(4)      NOT NULL,
    titular         VARCHAR(120)    NOT NULL,
    expiracion      VARCHAR(7)      NOT NULL,
    es_principal    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metodos_pago_usuario ON metodos_pago (usuario_id);
