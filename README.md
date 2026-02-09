# 🌹 Mon Amour Studio – E-Commerce Monorepo

Plataforma de comercio electrónico basada en microservicios para **Mon Amour Studio**.

## Arquitectura

| Componente | Tecnología | Puerto |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + Tailwind · Nginx proxy | `:80` |
| **Usuarios** | FastAPI · PostgreSQL · Redis · JWT | HTTP `8000` |
| **Inventario** | FastAPI · PostgreSQL · gRPC | HTTP `8000` / gRPC `50052` |
| **Pedidos** | FastAPI · PostgreSQL · JWT | HTTP `8000` |
| **Entregas** | FastAPI · PostgreSQL · gRPC | HTTP `8000` / gRPC `50054` |
| **Campañas** | FastAPI · PostgreSQL | HTTP `8000` |
| **Kafka** | Bitnami Kafka 3.7 (KRaft, sin Zookeeper) | `9092` |
| **MinIO** | Object storage (buckets por servicio) | `9000` / Console `9001` |
| **Prometheus** | Métricas | `9090` |
| **Grafana** | Dashboards (admin/admin) | `3000` |
| **Jaeger** | Tracing OpenTelemetry | `16686` (UI) / `4317` (OTLP) |

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Usuarios│    │Inventario│    │ Pedidos  │    │ Entregas │    │ Campañas │
│ :8000   │    │:8000/gRPC│    │  :8000   │    │:8000/gRPC│    │  :8000   │
└────┬────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │              │               │               │               │
     └──────────────┴───────┬───────┴───────────────┴───────────────┘
                            │
                      ┌─────┴─────┐
                      │   Kafka   │  (event bus)
                      └───────────┘
```

---

## Requisitos previos

- **Docker** ≥ 24 y **Docker Compose** v2
- ~8 GB RAM libres (se levantan ≈20 contenedores)
- Puertos libres: `80`, `9000`, `9001`, `9090`, `3000`, `16686`

---

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone <repo-url> MonAmourStudio && cd MonAmourStudio

# 2. Levantar toda la plataforma
cd infra
docker compose up --build -d

# 3. Verificar que todos los contenedores estén sanos
docker compose ps

# 4. Abrir la tienda en el navegador
open http://localhost        # Frontend
open http://localhost:9001   # MinIO Console  (minioadmin / minioadmin)
open http://localhost:3000   # Grafana        (admin / admin)
open http://localhost:16686  # Jaeger UI
```

> **Primera ejecución:** las migraciones SQL se ejecutan automáticamente al iniciar cada Postgres.

---

## Endpoints principales

### Usuarios (`/api/users`)

```bash
# Registrar usuario
curl -X POST http://localhost/api/users/register \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana García","email":"ana@test.com","password":"Pass1234!"}'

# Iniciar sesión (obtener JWT)
curl -X POST http://localhost/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@test.com","password":"Pass1234!"}'
# → {"access_token":"eyJ...","token_type":"bearer"}

# Perfil (con token)
curl http://localhost/api/users/me \
  -H "Authorization: Bearer <token>"
```

### Inventario (`/api/inventory`)

```bash
# Listar productos
curl http://localhost/api/inventory/productos

# Crear producto (admin)
curl -X POST http://localhost/api/inventory/productos \
  -H 'Content-Type: application/json' \
  -d '{"sku":"MA-001","nombre":"Ramo Clásico","descripcion":"12 rosas rojas","precio":45.00,"stock":100}'

# Obtener un producto
curl http://localhost/api/inventory/productos/<id>

# Reservar stock
curl -X POST http://localhost/api/inventory/productos/<id>/reserve \
  -H 'Content-Type: application/json' \
  -d '{"cantidad":2,"pedido_id":"<uuid>"}'
```

### Pedidos (`/api/orders`)

```bash
# Crear pedido
curl -X POST http://localhost/api/orders/pedidos \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <token>" \
  -d '{
    "direccion_entrega":"Av. Reforma 123",
    "items":[{"producto_id":"<uuid>","cantidad":2,"precio_unitario":45.00}]
  }'

# Listar mis pedidos
curl http://localhost/api/orders/pedidos \
  -H "Authorization: Bearer <token>"

# Procesar pago
curl -X POST http://localhost/api/orders/pedidos/<id>/pago \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <token>" \
  -d '{"metodo":"tarjeta","referencia":"TXN-123456"}'
```

### Entregas (`/api/deliveries`)

```bash
# Listar entregas
curl http://localhost/api/deliveries/entregas

# Obtener entrega por pedido
curl http://localhost/api/deliveries/entregas/pedido/<pedido_id>

# Actualizar estado
curl -X PUT http://localhost/api/deliveries/entregas/<id>/estado \
  -H 'Content-Type: application/json' \
  -d '{"estado":"en_camino","notas":"Salió del centro de distribución"}'
```

### Campañas (`/api/campaigns`)

```bash
# Crear campaña
curl -X POST http://localhost/api/campaigns/campanas \
  -H 'Content-Type: application/json' \
  -d '{"titulo":"San Valentín 2025","mensaje_global":"¡Ofertas especiales!","fecha_inicio":"2025-02-01","fecha_fin":"2025-02-14"}'

# Activar campaña
curl -X POST http://localhost/api/campaigns/campanas/<id>/activar

# Crear publicación
curl -X POST http://localhost/api/campaigns/publicaciones \
  -H 'Content-Type: application/json' \
  -d '{"campana_id":"<uuid>","tipo_media":"imagen","caption":"Flores para ti","canal":"instagram"}'
```

### Health Checks

Cada microservicio expone:
```bash
curl http://localhost/api/users/health
curl http://localhost/api/inventory/health
curl http://localhost/api/orders/health
curl http://localhost/api/deliveries/health
curl http://localhost/api/campaigns/health
```

---

## Flujo de eventos (Kafka)

```
1. POST /pedidos           → publica "order.created"
2. Inventario consume      → reserva stock → publica "stock.reserved"
3. POST /pedidos/{id}/pago → publica "payment.succeeded"
4. Entregas consume        → crea Entrega con guía MA-XXXXXXXX → publica "entrega.programada"
5. Campañas consume        → actualiza analytics
```

---

## Estructura del proyecto

```
MonAmourStudio/
├── back-end/
│   ├── usuarios/          # Registro, login, JWT, perfiles
│   ├── inventario/        # Productos, stock, reglas, gRPC server
│   ├── pedidos/           # Órdenes, ítems, pagos
│   ├── entregas/          # Envíos, tracking, gRPC server
│   └── campanas/          # Campañas de marketing, publicaciones
├── front-end/             # Next.js 16 + React 19 + Tailwind + shadcn/ui
│   ├── app/               # App Router (pages)
│   ├── components/        # UI components
│   ├── lib/               # Utils, API client
│   └── Dockerfile         # Multi-stage build → Nginx
├── infra/
│   ├── docker-compose.yml # Orquestación completa
│   ├── nginx/default.conf # Proxy config
│   ├── prometheus/        # Scrape config
│   └── grafana/           # Datasource provisioning
├── tests/
│   ├── test_*.py          # Unit tests por servicio
│   └── test_integration.py# Integration test (flujo completo)
├── Diagrama Clases.PLANTUML
├── Diagrama Despliegue.PLANTUML
├── pyproject.toml         # ruff + pytest config
├── .pre-commit-config.yaml
└── README.md
```

---

## Tests

### Unit tests

```bash
# Instalar dependencias de test
pip install pytest pytest-asyncio httpx

# Ejecutar todos los tests
pytest tests/ -v

# Ejecutar tests de un servicio específico
pytest tests/test_usuarios.py -v
pytest tests/test_inventario.py -v
pytest tests/test_pedidos.py -v
pytest tests/test_entregas.py -v
pytest tests/test_campanas.py -v
```

### Integration test

> Requiere que la plataforma esté corriendo (`docker compose up`).

```bash
pytest tests/test_integration.py -v --timeout=120
```

---

## Observabilidad

| Herramienta | URL | Credenciales |
|---|---|---|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | admin / admin |
| Jaeger UI | http://localhost:16686 | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

Cada microservicio expone `/metrics` (Prometheus) y envía trazas OTLP a Jaeger `:4317`.

---

## PlantUML

Los diagramas se encuentran en la raíz del proyecto:

- **Diagrama Clases.PLANTUML** – Clases, entidades, servicios, repositorios y controladores de todos los microservicios + frontend.
- **Diagrama Despliegue.PLANTUML** – Refleja exactamente los servicios, puertos, redes y volúmenes del `docker-compose.yml`.

Para renderizar:
```bash
# Con PlantUML CLI
java -jar plantuml.jar "Diagrama Clases.PLANTUML" "Diagrama Despliegue.PLANTUML"

# O con la extensión de VS Code "PlantUML"
```

---

## Detener / limpiar

```bash
# Detener todos los contenedores
cd infra && docker compose down

# Detener y eliminar volúmenes (⚠️ borra datos)
docker compose down -v

# Reconstruir un servicio específico
docker compose up --build -d usuarios
```

---

## Variables de entorno importantes

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `JWT_SECRET` | Clave para firmar tokens JWT | `super-secret-key-change-in-production` |
| `DATABASE_URL` | Conexión asyncpg a PostgreSQL | (por servicio) |
| `KAFKA_BOOTSTRAP_SERVERS` | Broker Kafka | `kafka:9092` |
| `OTLP_ENDPOINT` | Collector OpenTelemetry | `http://jaeger:4317` |
| `MINIO_ENDPOINT` | MinIO server | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `REDIS_URL` | Redis (solo usuarios) | `redis://redis:6379/0` |

---

## Licencia

Proyecto privado – Mon Amour Studio © 2025
