# MonAmourStudio app-stack

Stack docker-compose para frontend (Nginx) y cinco microservicios FastAPI con Postgres por servicio, MinIO central y Redis.

## Requisitos previos
- Docker 24+
- Docker Compose V2
- Opcional: `docker network create ecommerce_net` (el compose la crea si no existe porque no es externa).

## Estructura
- back-end/usuarios|inventario|pedidos|entregas|campanas: cada uno con Dockerfile, entrypoint y FastAPI mínimo.
- front-end/: build estática servida por Nginx (monta `front-end/build`).
- `docker-compose.yml`: define servicios, redes y volúmenes.
- `.env.template`: variables globales a copiar en `.env`.

## Puertos expuestos
- Frontend: 8080
- Usuarios 8001, Inventario 8002, Pedidos 8003, Entregas 8004, Campanas 8005
- Redis 6379, MinIO 9000 (API) / 9001 (console)

## Pasos de arranque
1) Copia variables
```
cp .env.template .env
cp back-end/usuarios/.env.template back-end/usuarios/.env
cp back-end/inventario/.env.template back-end/inventario/.env
cp back-end/pedidos/.env.template back-end/pedidos/.env
cp back-end/entregas/.env.template back-end/entregas/.env
cp back-end/campanas/.env.template back-end/campanas/.env
```

2) Build frontend (si aún no existe `front-end/build`)
```
cd front-end
pnpm install
pnpm run build
cd ..
```

3) Levanta todo
```
docker compose up -d --build
```

4) Crear buckets en MinIO (desde host)
```
docker run --rm --network ecommerce_net -e MC_HOST_minio=http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@minio:9000 minio/mc mb -p minio/inventory
# Repite para campaigns, orders, users
```

5) Migraciones / seed (opcional)
- Implementa migraciones con Alembic u otro y ejecuta con `docker compose run --rm usuarios alembic upgrade head`.
- Controla el seed con la variable `SEED=false` (no realiza seed por defecto).

6) Nginx Proxy Manager / cloudflared
- Publica los contenedores que necesites apuntando a los puertos indicados dentro de la red `ecommerce_net`.
- NPM y cloudflared viven fuera del compose; solo necesitan alcanzar los servicios en esa red.

## Pruebas rápidas
```
curl http://localhost:8001/healthz
curl -X POST http://localhost:8001/auth/register -H "Content-Type: application/json" -d '{"email":"demo@example.com","password":"pass"}'
curl http://localhost:8002/products
curl -X POST http://localhost:8003/orders -H "Content-Type: application/json" -d '{"customer_id":"c1","items":["p1"],"total":10.5}'
curl http://localhost:8004/deliveries/any-id
curl -X POST http://localhost:8005/campaigns -H "Content-Type: application/json" -d '{"name":"camp1","budget":100}'
```

## Notas de seguridad
- Reemplaza todas las claves de `.env.template` por valores seguros antes de producción.
- Configura HTTPS en Nginx Proxy Manager o Cloudflare Tunnel.
