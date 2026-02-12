# Mon Amour Studio — Workflows n8n

> **Versión**: 1.0  
> **Fecha**: 2026-02-09  
> **Arquitectura**: Event-driven con Kafka · 5 microservicios FastAPI · n8n como orquestador externo  
> **Microservicios**: Usuarios, Inventario, Pedidos (incl. PasarelaPago), Entregas, Campañas  

---

## Convenciones Globales

| Concepto | Valor por defecto | Placeholder |
|----------|-------------------|-------------|
| Kafka Bootstrap | `kafka:9092` | `{{KAFKA_BOOTSTRAP_SERVERS}}` |
| Redis | `redis://redis:6379/0` | `{{REDIS_URL}}` |
| Consumer Group base | `n8n-{workflow-id}` | `{{N8N_CONSUMER_GROUP}}` |
| DLQ prefix | `dead-letter.` | `{{DLQ_PREFIX}}` |
| Trace ID header | `X-Trace-Id` | — |
| Correlation ID header | `X-Correlation-Id` | — |
| Idempotency TTL | 48 h (negocio) / 24 h (técnico) | — |
| Reintentos máximos | 3 | `{{MAX_RETRIES}}` |
| Admin email | configurable | `{{ADMIN_EMAIL}}` |

### Topics Kafka actuales en el código

| Topic real | Evento(s) | Productor |
|-----------|-----------|-----------|
| `order.created` | `order.created` | Pedidos |
| `payment.succeeded` | `payment.succeeded` | Pedidos |
| `inventory` | `product.created`, `stock.reserved`, `stock.released` | Inventario |
| `entrega.programada` | `entrega.programada` | Entregas |
| `entrega.{estado}` | estado dinámico | Entregas |
| `entrega.reagendada` | `entrega.reagendada` | Entregas |
| `usuarios` | `user_registered` | Usuarios |
| `campana.activada` | `campana.activada` | Campañas |
| `publicacion.publicada` | `publicacion.publicada` | Campañas |
| `publicacion.programada` | `publicacion.programada` | Campañas |

> ⚠️ **Bug conocido**: Inventario publica `stock.reserved` al topic `"inventory"` pero Pedidos consume del topic `"stock.reserved"`. Los workflows orquestados por n8n usan llamadas HTTP y no dependen de este consumer directo, pero se recomienda alinear los topics en el código fuente.

---

## WF-01 · Orquestación Inicial de Pedido

### Contexto
Cuando un cliente realiza un pedido, el microservicio **Pedidos** publica `order.created` a Kafka. n8n orquesta la saga: reservar stock → iniciar pago → publicar resultado.

### Objetivo
Ejecutar la saga de orquestación de pedido de forma atómica con compensación automática ante fallos.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productor del trigger** | Pedidos |
| **Consumidores/invocados** | Inventario, Pedidos (pago), Campañas, n8n |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{ORDER_CREATED_TOPIC|order.created}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-order-orch}}
```

### Precondiciones
- Pedidos activo y publicando a `order.created`
- Inventario expone endpoint de reserva de stock
- Redis disponible
- Credenciales `{{INVENTORY_API_KEY}}`, `{{PAYMENT_API_KEY}}` configuradas en n8n

### Payload de ejemplo (trigger)

```json
{
  "event": "order.created",
  "event_id": "{{EVENT_ID}}",
  "pedido_id": "{{ORDER_ID}}",
  "usuario_id": "{{USER_ID}}",
  "total": "125.50",
  "items": [
    {
      "producto_id": "{{PRODUCT_ID_1}}",
      "variante": "Marco Dorado 20x30",
      "cantidad": 2,
      "precio_unitario": "45.00"
    },
    {
      "producto_id": "{{PRODUCT_ID_2}}",
      "variante": "Set Regalo Premium",
      "cantidad": 1,
      "precio_unitario": "35.50"
    }
  ]
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir order.created | Topic: `{{ORDER_CREATED_TOPIC\|order.created}}`, Group: `n8n-order-orch`, Bootstrap: `{{KAFKA_BOOTSTRAP_SERVERS}}` |
| 2 | **Set** | Generar trace_id | `trace_id` = `{{ $json.trace_id ?? $uuid }}`, `correlation_id` = `{{ $json.pedido_id }}` |
| 3 | **Redis** | Verificar idempotencia | Comando: `GET idempotency:order-orch:{{EVENT_ID}}`. Si existe → **Stop**. Si no → `SET` con TTL 172800s |
| 4 | **HTTP Request** | Reservar stock (loop por item) | **URL**: `{{INVENTORY_RESERVE_ENDPOINT\|/api/inventory/{product_id}/reserve}}` · **Method**: POST · **Body**: `{"cantidad": N, "pedido_id": "..."}` · **Auth**: Header `Authorization: Bearer {{INVENTORY_API_KEY}}` · **Headers**: `X-Trace-Id`, `X-Correlation-Id` · **Retry**: 3, backoff 2s exp · **Timeout**: 10s |
| 5 | **If** | Evaluar reserva | Condición: `{{ $allSuccess }}` — todas las reservas OK → paso 6. Alguna falló → paso 8 |
| 6 | **HTTP Request** | Iniciar pago | **URL**: `{{PAYMENT_CREATE_ENDPOINT\|/api/orders/{pedido_id}/pago}}` · **Method**: POST · **Body**: `{"metodo_pago": "tarjeta", "monto": total}` · **Auth**: Bearer `{{PAYMENT_API_KEY}}` · **Retry**: 2, backoff 5s · **Timeout**: 30s |
| 7 | **Kafka** | Publicar order.orchestrated | Topic: `{{ORDER_ORCHESTRATED_TOPIC\|order.orchestrated}}`, Payload: `{event, pedido_id, stock_reserved: true, payment_initiated: true, trace_id, timestamp}` |
| 8 | **HTTP Request** | Compensar stock (loop) | **URL**: `{{INVENTORY_RELEASE_ENDPOINT\|/api/inventory/{product_id}/release}}` · **Method**: POST · **Body**: `{"cantidad": N, "pedido_id": "..."}` · **Retry**: 3 |
| 9 | **HTTP Request** | Marcar pedido cancelado | **URL**: `{{ORDER_STATUS_ENDPOINT\|/api/orders/{pedido_id}/estado}}` · **Method**: PUT · **Body**: `{"estado": "cancelado"}` |
| 10 | **Function** | Emitir métricas | Registrar `duration_ms`, `success_count` o `failure_count` |

### Idempotencia
- **Estrategia**: `event_id` como clave en Redis (`idempotency:order-orch:{event_id}`), TTL 48h
- **Dedup field**: `event_id`

### DLQ y Reintentos
- **Reintentos**: 3 intentos, backoff exponencial (2s, 4s, 8s), jitter habilitado
- **DLQ topic**: `{{DLQ_ORDER_ORCH_TOPIC|dead-letter.order-orchestration}}`
- **Metadata en DLQ**: `event_id`, `pedido_id`, `error_message`, `trace_id`, `failed_step`, `attempt_count`, `timestamp`

### Métricas y Trazas
- `workflow.order_orchestration.duration_ms`
- `workflow.order_orchestration.success_count`
- `workflow.order_orchestration.failure_count`
- `workflow.order_orchestration.dlq_count`
- **Trace fields**: `trace_id`, `correlation_id`, `pedido_id`, `event_id`

### Runbook
1. **Workflow no se dispara**: Verificar que Pedidos publique a topic `order.created` (`kafka-console-consumer --topic order.created`). Verificar consumer group `n8n-order-orch` con `kafka-consumer-groups --describe`.
2. **Fallo en reserva de stock**: Verificar disponibilidad del producto en `GET /api/inventory/{id}`. Verificar logs de Inventario.
3. **Fallo en pago**: Verificar logs de Pedidos, endpoint `/api/orders/{id}/pago`. Verificar si la compensación de stock ejecutó correctamente.
4. **Mensaje en DLQ**: Inspeccionar `dead-letter.order-orchestration`, corregir causa raíz, republicar manualmente o esperar DLQ handler.

### Checklist de Pruebas

- [x] **Happy Path**: Order con 2 items con stock → stock reservado, pago OK, order.orchestrated publicado
- [x] **Fallo 1**: Item sin stock → reservas parciales compensadas, pedido cancelado, DLQ
- [x] **Fallo 2**: Pago 503 × 3 → stock liberado, pedido cancelado, DLQ con attempt_count=3

---

## WF-02 · Confirmación de Pago

### Contexto
La pasarela de pago (dentro de **Pedidos**) publica `payment.succeeded` cuando un pago es exitoso. n8n coordina la actualización del pedido, creación de entrega y notificación al cliente.

### Objetivo
Transicionar el pedido a estado "confirmado", crear la orden de entrega y notificar al cliente.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productor del trigger** | Pedidos (PasarelaPago) |
| **Consumidores/invocados** | Pedidos, Entregas, Usuarios, Campañas |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{PAYMENT_SUCCEEDED_TOPIC|payment.succeeded}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-payment-confirm}}
```

### Precondiciones
- Pedidos ha publicado `payment.succeeded`
- Entregas expone endpoint de creación
- Credenciales `{{ORDERS_API_KEY}}`, `{{DELIVERIES_API_KEY}}` configuradas

### Payload de ejemplo (trigger)

```json
{
  "event": "payment.succeeded",
  "event_id": "{{EVENT_ID}}",
  "pedido_id": "{{ORDER_ID}}",
  "usuario_id": "{{USER_ID}}",
  "monto": "125.50",
  "metodo_pago": "tarjeta",
  "referencia_pago": "PAY-{{REFERENCE}}"
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir payment.succeeded | Topic: `payment.succeeded`, Group: `n8n-payment-confirm` |
| 2 | **Set** | trace_id + correlation_id | `trace_id` = existente o UUID, `correlation_id` = `pedido_id` |
| 3 | **Redis** | Idempotencia | `GET/SET idempotency:payment-confirm:{event_id}` TTL 48h |
| 4 | **HTTP Request** | Actualizar estado pedido | PUT `{{ORDER_STATUS_ENDPOINT}}` body: `{"estado": "confirmado"}` Auth: Bearer `{{ORDERS_API_KEY}}` |
| 5 | **HTTP Request** | Obtener detalle pedido | GET `{{ORDER_DETAIL_ENDPOINT}}` → dirección, items, email cliente |
| 6 | **HTTP Request** | Crear entrega | POST `{{DELIVERY_CREATE_ENDPOINT\|/api/deliveries/}}` body: `{pedido_id, direccion, items}` Auth: Bearer `{{DELIVERIES_API_KEY}}` · Retry: 3, backoff 3s |
| 7 | **Kafka** | Notificar al cliente | Topic: `notification.request`, payload: `{tipo: "pago_confirmado", canal: "email", destinatario: email, datos: {pedido_id, monto}}` |
| 8 | **Function** | Métricas + audit | Registrar duración, publicar a `audit.log` |

### Idempotencia
- `event_id` en Redis, TTL 48h

### DLQ y Reintentos
- **Reintentos**: 3, exponencial (2s, 4s, 8s), jitter
- **DLQ**: `dead-letter.payment-confirmation`
- **Metadata**: `event_id`, `pedido_id`, `error_message`, `trace_id`, `failed_step`

### Métricas
- `workflow.payment_confirmation.duration_ms` / `success_count` / `failure_count` / `dlq_count`

### Runbook
1. **No se recibe payment.succeeded**: Verificar que Pedidos publique al topic. Usar `kafka-console-consumer --topic payment.succeeded --from-beginning`.
2. **Entrega no se crea**: Verificar logs de Entregas, endpoint `/api/deliveries/`. NOTA: Entregas tiene su propio consumer de `payment.succeeded` que también crea entregas — verificar que no duplique.
3. **DLQ**: Inspeccionar `dead-letter.payment-confirmation`, corregir, republicar.

### Checklist de Pruebas

- [x] **Happy Path**: payment.succeeded → pedido confirmado, entrega creada, email enviado
- [x] **Fallo 1**: Entregas 503 × 3 → pedido confirmado (ese paso sí pasó), entrega NO creada, DLQ
- [x] **Fallo 2**: event_id duplicado → segundo mensaje descartado

---

## WF-03 · Compensación de Stock

### Contexto
Cuando se libera stock (pedido cancelado, pago rechazado), **Inventario** publica `stock.released` al topic `inventory`. n8n verifica integridad, genera alertas si hay umbrales críticos.

### Objetivo
Monitorear liberaciones de stock, verificar integridad y alertar sobre productos agotados o con baja disponibilidad.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productor del trigger** | Inventario |
| **Consumidores/invocados** | Inventario (consulta), Campañas (alertas) |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{STOCK_RELEASED_TOPIC|inventory}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-stock-compensation}}
Filtro: event == "stock.released"
```

> ⚠️ El topic real es `inventory`, NO `stock.released`. Se filtra por campo `event`.

### Payload de ejemplo (trigger)

```json
{
  "event": "stock.released",
  "product_id": "{{PRODUCT_ID}}",
  "pedido_id": "{{ORDER_ID}}",
  "cantidad": 3,
  "disponibilidad_restante": 2
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir topic inventory | Topic: `inventory`, Group: `n8n-stock-compensation` |
| 2 | **If** | Filtrar stock.released | `$json.event === "stock.released"` → continuar, else → stop |
| 3 | **Set** | Trazabilidad | `trace_id` = UUID, `correlation_id` = `pedido_id` |
| 4 | **Redis** | Idempotencia | Clave: `idempotency:stock-comp:{product_id}:{pedido_id}` TTL 24h |
| 5 | **HTTP Request** | Consultar producto | GET `{{INVENTORY_PRODUCT_ENDPOINT\|/api/inventory/{product_id}}}` Auth: Bearer `{{INVENTORY_API_KEY}}` |
| 6 | **Switch** | Evaluar umbral | `disponibilidad == 0` → "agotado", `< 5` → "bajo", `>= 5` → "normal" |
| 7 | **Kafka** | Alerta admin (si aplica) | Topic: `notification.request`, tipo: `alerta_stock`, severidad según umbral |
| 8 | **Kafka** | Audit log | Topic: `audit.log`, accion: `stock_compensado` |

### Idempotencia
- Clave compuesta `product_id:pedido_id` en Redis, TTL 24h

### DLQ y Reintentos
- **Reintentos**: 2, linear (3s, 6s), jitter
- **DLQ**: `dead-letter.stock-compensation`

### Runbook
1. **No se recibe evento**: Verificar que Inventario publique a topic `inventory`. Filtrar por `event=stock.released`.
2. **Alertas de stock no llegan**: Verificar que notification-dispatcher esté activo.
3. **Disponibilidad incorrecta**: Comparar `disponibilidad_restante` del evento vs valor real en GET del producto.

### Checklist de Pruebas

- [x] **Happy Path**: stock.released con disponibilidad 20 → audit.log, sin alerta
- [x] **Fallo 1**: disponibilidad 0 → alerta "agotado" a notification.request
- [x] **Fallo 2**: producto eliminado (404) → DLQ, alerta admin

---

## WF-04 · Programación de Envío

### Contexto
Tras la confirmación de pago, n8n valida la zona de entrega, crea la orden de envío y notifica al cliente con la guía.

### Objetivo
Automatizar la generación de guías de entrega con validación de zona de cobertura.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productor del trigger** | Pedidos |
| **Consumidores/invocados** | Entregas, Pedidos, Usuarios |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{PAYMENT_SUCCEEDED_TOPIC|payment.succeeded}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-shipment-sched}}
```

### Payload de ejemplo (trigger)
```json
{
  "event": "payment.succeeded",
  "event_id": "{{EVENT_ID}}",
  "pedido_id": "{{ORDER_ID}}",
  "usuario_id": "{{USER_ID}}",
  "monto": "125.50"
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir payment.succeeded | Topic: `payment.succeeded`, Group: `n8n-shipment-sched` |
| 2 | **Set** | Trazabilidad | trace_id, correlation_id |
| 3 | **Redis** | Idempotencia | `idempotency:shipment-sched:{event_id}` TTL 48h |
| 4 | **HTTP Request** | Obtener detalle pedido | GET `{{ORDER_DETAIL_ENDPOINT}}` |
| 5 | **HTTP Request** | Validar zona | POST `{{DELIVERY_VALIDATE_ZONE_ENDPOINT\|/api/deliveries/validar-zona}}` body: `{ciudad, provincia}` |
| 6 | **If** | ¿Zona válida? | `zona_valida == true` → paso 7. `false` → paso 9 (notificar zona no cubierta) |
| 7 | **HTTP Request** | Crear entrega | POST `{{DELIVERY_CREATE_ENDPOINT\|/api/deliveries/}}` Auth: Bearer `{{DELIVERIES_API_KEY}}` · Retry: 3 |
| 8 | **Kafka** | Publicar shipment.scheduled | Topic: `{{SHIPMENT_SCHEDULED_TOPIC\|shipment.scheduled}}` |
| 9 | **Kafka** | Notificar al cliente | Topic: `notification.request`, tipo: `envio_programado` o `zona_no_cubierta` |
| 10 | **Function** | Métricas + audit | duration_ms, audit.log |

### Idempotencia
- `event_id` en Redis, TTL 48h

### DLQ y Reintentos
- **Reintentos**: 3, exponencial, jitter
- **DLQ**: `dead-letter.shipment-scheduling`

### Runbook
1. **Zona no cubierta**: Verificar reglas de zona en Entregas. Considerar ampliar cobertura.
2. **Entregas no responde**: Revisar logs del servicio, verificar health endpoint.
3. **Duplicación con consumer nativo**: Entregas tiene consumer propio de `payment.succeeded`. Coordinar para evitar doble creación.

### Checklist de Pruebas

- [x] **Happy Path**: Dirección en zona cubierta → entrega creada, shipment.scheduled, email al cliente
- [x] **Fallo 1**: Zona no cubierta → notificación "zona_no_cubierta", alerta admin
- [x] **Fallo 2**: Entregas caído × 3 → DLQ, alerta admin

---

## WF-05 · Dispatcher de Notificaciones

### Contexto
Hub central de envío de notificaciones. Todos los workflows publican solicitudes a `notification.request` y este dispatcher las enruta al canal correcto.

### Objetivo
Rutear y enviar notificaciones multi-canal (email, WhatsApp, push, Slack) de forma confiable.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productores del trigger** | Todos los workflows (Pedidos, Entregas, Inventario, Campañas) |
| **Consumidores/invocados** | Usuarios (datos), n8n (envío) |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{NOTIFICATION_REQUEST_TOPIC|notification.request}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-notification-dispatch}}
```

### Payload de ejemplo (trigger)

```json
{
  "tipo": "pago_confirmado",
  "canal": "email",
  "destinatario": "cliente@example.com",
  "datos": {
    "pedido_id": "{{ORDER_ID}}",
    "monto": "125.50",
    "fecha_estimada_entrega": "2026-02-15"
  },
  "trace_id": "{{TRACE_ID}}",
  "correlation_id": "{{CORRELATION_ID}}"
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir notificación | Topic: `notification.request`, Group: `n8n-notification-dispatch` |
| 2 | **Set** | Trazabilidad | Extraer/generar trace_id, correlation_id |
| 3 | **Redis** | Idempotencia | `idempotency:notif:{trace_id}:{tipo}:{destinatario}` TTL 24h |
| 4 | **Switch** | Determinar canal | `canal == "email"` → SMTP · `canal == "whatsapp"` → HTTP WhatsApp API · `canal == "push"` → HTTP FCM · `canal == "admin_slack"` → Slack |
| 5a | **SMTP** | Enviar email | **Credential**: `{{SMTP_CREDENTIAL}}` · **From**: `{{SMTP_FROM\|noreply@monamourstudio.com}}` · **To**: `destinatario` · **Subject/Body**: según tipo y template · Retry: 3, backoff 5s |
| 5b | **HTTP Request** | Enviar WhatsApp | POST `{{WHATSAPP_API_ENDPOINT}}` Auth: Bearer `{{WHATSAPP_API_TOKEN}}` · Template según tipo · Retry: 2 |
| 5c | **HTTP Request** | Enviar push | POST `{{PUSH_NOTIFICATION_ENDPOINT}}` Auth: `{{PUSH_API_KEY}}` · Retry: 2 |
| 5d | **Slack** | Enviar a Slack | Canal: `{{SLACK_ADMIN_CHANNEL\|#mon-amour-alerts}}` · Credential: `{{SLACK_CREDENTIAL}}` |
| 6 | **Kafka** | Registrar resultado | Topic: `audit.log`, accion: `notificacion_enviada`, resultado: ok/error |

### Idempotencia
- Clave compuesta `trace_id:tipo:destinatario` en Redis, TTL 24h

### DLQ y Reintentos
- Backoff distinto por canal: email 5s, WhatsApp 10s, push 5s
- **DLQ**: `dead-letter.notification-dispatcher`

### Runbook
1. **Email no llega**: Verificar credenciales SMTP, logs de mail server. Verificar que no sea spam.
2. **WhatsApp falla**: Verificar token de WhatsApp Business API, límites de envío.
3. **Canal desconocido**: Agregar nuevo branch en Switch node para el canal nuevo.

### Checklist de Pruebas

- [x] **Happy Path**: canal=email, tipo=pago_confirmado → email enviado, audit.log OK
- [x] **Fallo 1**: SMTP caído × 3 → DLQ, audit.log con error
- [x] **Fallo 2**: canal="sms" (no soportado) → DLQ con "canal_no_soportado"

---

## WF-06 · Activación de Campaña Publicitaria

### Contexto
El administrador crea y activa campañas desde el dashboard. **Campañas** publica `campana.activada`. n8n coordina la publicación digital y notificación masiva segmentada.

### Objetivo
Automatizar la ejecución de campañas: publicar contenido, enviar notificaciones segmentadas, registrar métricas de alcance.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productor del trigger** | Campañas |
| **Consumidores/invocados** | Campañas, Usuarios, n8n |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{CAMPAIGN_ACTIVATED_TOPIC|campana.activada}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-campaign-activation}}
```

### Payload de ejemplo (trigger)

```json
{
  "event": "campana.activada",
  "campana_id": "{{CAMPAIGN_ID}}",
  "nombre": "Dia de la Madre 2026",
  "tipo": "descuento",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-10",
  "segmento_clientes": "todos"
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir campana.activada | Topic: `campana.activada`, Group: `n8n-campaign-activation` |
| 2 | **Set** | Trazabilidad | trace_id = UUID, correlation_id = campana_id |
| 3 | **Redis** | Idempotencia | `idempotency:campaign:{campana_id}` TTL 72h |
| 4 | **HTTP Request** | Obtener detalle campaña | GET `{{CAMPAIGN_DETAIL_ENDPOINT\|/api/campaigns/{campana_id}}}` |
| 5 | **HTTP Request** | Obtener usuarios | GET `{{USERS_LIST_ENDPOINT\|/api/users/}}` Auth: Bearer `{{USERS_API_KEY}}` |
| 6 | **Function** | Generar batches | Dividir usuarios en batches de 50. Crear payload de notificación para cada uno. |
| 7 | **Kafka** (loop) | Publicar notificaciones | Topic: `notification.request`, un mensaje por batch con tipo: `campaña` |
| 8 | **HTTP Request** | Publicar en redes (opcional) | POST `{{SOCIAL_MEDIA_API_ENDPOINT}}` si flag `publicar_redes=true` |
| 9 | **Kafka** | Registrar métricas | Topic: `audit.log`, accion: `campaña_ejecutada`, total_destinatarios |

### Idempotencia
- `campana_id` en Redis, TTL 72h

### DLQ y Reintentos
- **Reintentos**: 2, exponencial (5s, 10s), jitter
- **DLQ**: `dead-letter.campaign-activation`

### Runbook
1. **Campaña no se ejecuta**: Verificar que Campañas publique `campana.activada`. Verificar estado de la campaña en el dashboard.
2. **Emails no se envían**: Verificar que notification-dispatcher esté procesando. Revisar batches en el workflow.
3. **Usuarios API lenta**: Aumentar timeout. Considerar paginación si hay muchos usuarios.

### Checklist de Pruebas

- [x] **Happy Path**: Campaña con 100 usuarios → 2 batches de 50, 100 notificaciones, audit.log
- [x] **Fallo 1**: Usuarios API 500 → DLQ, campaña marcada como fallida
- [x] **Fallo 2**: campana_id duplicado → descartado por Redis

> **NOTA**: Se necesita una **UI de campañas publicitarias** en el dashboard. Actualmente no existe interfaz para crear, activar ni monitorear campañas.

---

## WF-07 · Alerta Administrativa

### Contexto
Eventos críticos (pedidos fallidos, fraude, stock agotado, errores de servicio) deben notificarse al equipo admin en menos de 60 segundos.

### Objetivo
Garantizar visibilidad inmediata de alertas críticas al equipo administrador por múltiples canales según severidad.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productores del trigger** | Todos los workflows y servicios |
| **Consumidores/invocados** | n8n (envío directo) |

### Trigger

```
Tipo: Kafka Trigger
Topic: {{NOTIFICATION_REQUEST_TOPIC|notification.request}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-admin-alert}}
Filtro: tipo IN ['alerta_stock', 'order_failed', 'fraud_detected', 'service_error', 'payment_failed', 'dlq_escalation', 'data_inconsistency']
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir notificaciones | Topic: `notification.request`, Group: `n8n-admin-alert` |
| 2 | **If** | Filtrar alertas admin | tipo in lista de tipos admin → continuar, else → stop |
| 3 | **Switch** | Clasificar severidad | `critica` → Slack + email + WhatsApp · `alta` → Slack + email · `media` → email |
| 4 | **Function** | Formatear mensaje | Timestamp, servicio, tipo, severidad, trace_id, enlace dashboard, acciones sugeridas |
| 5 | **Slack** | Enviar a Slack | Canal: `{{SLACK_ADMIN_CHANNEL}}`, bloques formateados. Credential: `{{SLACK_CREDENTIAL}}` |
| 6 | **SMTP** | Email admin | To: `{{ADMIN_EMAIL}}`, Asunto: `[ALERTA {severidad}] {tipo}`. Credential: `{{SMTP_CREDENTIAL}}` |
| 7 | **HTTP Request** | WhatsApp admin (solo críticas) | POST `{{WHATSAPP_API_ENDPOINT}}` al `{{ADMIN_PHONE}}` |
| 8 | **Kafka** | Audit log | Topic: `audit.log`, accion: `alerta_admin_enviada` |

### Idempotencia
- `trace_id + tipo` en Redis, TTL 1h

### DLQ y Reintentos
- **Reintentos**: 2, linear (3s, 6s)
- **DLQ**: `dead-letter.admin-alert`

### Runbook
1. **Alertas no llegan**: Verificar consumer group. Verificar filtro de tipos.
2. **Slack falla**: Verificar OAuth token de Slack. Canales independientes — email debería funcionar.
3. **Demasiadas alertas**: Ajustar filtros de severidad o agregar rate limiting con Redis.

### Checklist de Pruebas

- [x] **Happy Path**: tipo=order_failed, severidad=alta → Slack + email recibidos
- [x] **Fallo 1**: Slack API caída → email sí enviado (canales independientes)
- [x] **Fallo 2**: tipo=unknown → descartado en paso 2

---

## WF-08 · Retry y DLQ Handler

### Contexto
Todos los workflows publican mensajes fallidos a topics `dead-letter.*`. Este workflow centraliza el reprocesamiento automático y escalamiento.

### Objetivo
Reintentar mensajes de DLQ automáticamente, escalar a operaciones si no se resuelve.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productores del trigger** | Todos los workflows (vía DLQ) |
| **Consumidores/invocados** | n8n |

### Trigger

```
Tipo: Kafka Trigger (múltiples)
Topics: dead-letter.order-orchestration, dead-letter.payment-confirmation,
        dead-letter.stock-compensation, dead-letter.shipment-scheduling,
        dead-letter.notification-dispatcher, dead-letter.campaign-activation,
        dead-letter.admin-alert, dead-letter.nightly-data-sync,
        dead-letter.audit-trace-export
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-dlq-handler}}
```

> NOTA: Kafka no soporta wildcard en topics nativamente. Usar múltiples Kafka Trigger nodes o suscribirse con regex (`dead-letter\..*`) si el connector lo soporta.

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** × N | Consumir DLQ topics | Un nodo por topic DLQ, todos convergiendo al paso 2 |
| 2 | **Set** | Extraer metadata DLQ | `original_topic`, `original_event`, `error_message`, `attempt_count`, `trace_id` |
| 3 | **Redis** | Verificar contador DLQ | `dlq-retry:{trace_id}:{original_topic}` INCR. Si > `{{DLQ_MAX_RETRIES\|3}}` → paso 6 |
| 4 | **Switch** | Clasificar error | `transient` (timeout, 503) → reintentar · `permanent` (400, 404) → escalar · `unknown` → reintentar 1 vez |
| 5 | **Wait** + **Kafka** | Republicar con delay | Wait `{{DLQ_RETRY_DELAY_SECONDS\|60}}` seg, luego publicar al `original_topic` con `attempt_count` incrementado |
| 6 | **Kafka** | Escalar a operaciones | Topic: `notification.request`, tipo: `dlq_escalation`, severidad: `critica` |
| 7 | **Kafka** | Audit log | Topic: `audit.log`, accion: `dlq_processed`, accion_tomada: `retry` o `escalated` |

### Idempotencia
- Contador en Redis `trace_id:topic:attempt_count`

### DLQ y Reintentos
- **Este ES el handler de DLQ**. Si falla, escalar directamente a Slack/email (no hay DLQ recursiva).

### Procedimiento para reprocesar DLQ manualmente

```bash
# 1. Inspeccionar mensajes en DLQ
kafka-console-consumer \
  --bootstrap-server {{KAFKA_BOOTSTRAP_SERVERS|kafka:9092}} \
  --topic dead-letter.order-orchestration \
  --from-beginning \
  --max-messages 10

# 2. Corregir la causa raíz del error (ej: servicio caído, datos incorrectos)

# 3. Republicar al topic original
kafka-console-producer \
  --bootstrap-server {{KAFKA_BOOTSTRAP_SERVERS|kafka:9092}} \
  --topic order.created < message.json

# 4. Verificar en n8n que el workflow procesó correctamente
# Dashboard n8n: {{N8N_BASE_URL|http://localhost:5678}}/workflow/{workflow_id}/executions
```

### Runbook
1. **DLQ creciendo**: Revisar error más frecuente. Si es transitorio, verificar salud del servicio destino.
2. **Errores permanentes**: Investigar payload malformado, corregir datos, republicar manualmente.
3. **Loop infinito**: El contador en Redis previene esto. Si attempt_count > max, escala sin republicar.

### Checklist de Pruebas

- [x] **Happy Path**: DLQ con error 503 → republicado al topic original con delay
- [x] **Fallo 1**: attempt_count ≥ 3 → escalado, NO republicado
- [x] **Fallo 2**: Error permanente 400 → escalado directamente sin reintento

---

## WF-09 · Snapshot / Data Sync Nocturno

### Contexto
A las 02:00 AM se ejecuta un batch que exporta snapshots de todos los servicios, verifica consistencia y genera reportes diarios.

### Objetivo
Mantener snapshots actualizados, detectar inconsistencias inter-servicio y enviar reporte diario al admin.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productor del trigger** | n8n (Cron) |
| **Consumidores/invocados** | Inventario, Pedidos, Entregas, Campañas |

### Trigger

```
Tipo: Cron
Expresión: {{NIGHTLY_SYNC_CRON|0 2 * * *}}
Zona horaria: {{NIGHTLY_SYNC_TIMEZONE|America/Guayaquil}}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Cron** | Trigger nocturno | Cron: `0 2 * * *`, Timezone: `America/Guayaquil` |
| 2 | **Set** | Trazabilidad | trace_id = `nightly-{UUID}`, correlation_id = `{fecha}` |
| 3 | **HTTP Request** | Snapshot inventario | GET `{{INVENTORY_LIST_ENDPOINT\|/api/inventory/}}` Auth: Bearer `{{INVENTORY_API_KEY}}` · Timeout: 60s |
| 4 | **HTTP Request** | Snapshot pedidos del día | GET `{{ORDERS_LIST_ENDPOINT\|/api/orders/}}` Auth: Bearer `{{ORDERS_API_KEY}}` · Timeout: 60s |
| 5 | **HTTP Request** | Snapshot entregas | GET `{{DELIVERIES_LIST_ENDPOINT\|/api/deliveries/}}` Auth: Bearer `{{DELIVERIES_API_KEY}}` · Timeout: 60s |
| 6 | **Function** | Verificar consistencia | Cruzar: pedidos confirmados sin entrega, stock reservado sin pedido, entregas sin pedido |
| 7 | **HTTP Request** | Guardar en MinIO | PUT `{{MINIO_ENDPOINT}}/snapshots/{fecha}/` archivos JSON |
| 8 | **Function** | Generar resumen | total_pedidos, ingresos, pendientes, entregas_completadas, stock_bajo, inconsistencias |
| 9 | **Kafka** | Enviar reporte email | Topic: `notification.request`, tipo: `reporte_diario`, canal: email, destinatario: `{{ADMIN_EMAIL}}` |
| 10 | **If** | ¿Hay inconsistencias? | Si sí → alerta severidad alta a notification.request |

### Idempotencia
- Clave `nightly-sync:{fecha}` en Redis, TTL 25h

### DLQ y Reintentos
- **Reintentos**: 3, exponencial (10s, 20s, 40s)
- **DLQ**: `dead-letter.nightly-data-sync`

### Runbook
1. **Cron no se ejecuta**: Verificar timezone en n8n. Verificar que el workflow esté activo.
2. **Servicio no responde**: Timeout alto (60s). Si persiste, verificar salud del servicio, generar snapshot parcial.
3. **MinIO caído**: Snapshot generado pero no almacenado → DLQ, alerta admin.
4. **Inconsistencias encontradas**: Investigar manualmente los IDs reportados. Puede ser lag de Kafka o error de proceso.

### Checklist de Pruebas

- [x] **Happy Path**: Cron 02:00 → snapshots en MinIO, reporte email, audit.log
- [x] **Fallo 1**: Inventario API caída → snapshot parcial, alerta error
- [x] **Fallo 2**: MinIO no disponible → DLQ, alerta admin

---

## WF-10 · Audit & Trace Export

### Contexto
Todos los workflows y servicios publican eventos de auditoría a `audit.log`. Este workflow los consume en batch, enriquece y exporta a almacenamiento persistente.

### Objetivo
Mantener registro de auditoría persistente en MinIO/S3 para compliance y análisis.

### Microservicios involucrados

| Rol | Servicio |
|-----|----------|
| **Productores del trigger** | Todos los servicios y workflows |
| **Consumidores/invocados** | n8n |

### Trigger

```
Tipo: Kafka Trigger (batch mode)
Topic: {{AUDIT_LOG_TOPIC|audit.log}}
Consumer Group: {{N8N_CONSUMER_GROUP|n8n-audit-export}}
Batch size: 100 mensajes o 60 segundos (lo que ocurra primero)
```

### Payload de ejemplo (trigger)

```json
{
  "accion": "stock_compensado",
  "servicio_origen": "n8n-stock-compensation",
  "trace_id": "{{TRACE_ID}}",
  "correlation_id": "{{CORRELATION_ID}}",
  "timestamp": "2026-02-09T22:34:10.143Z",
  "datos": {
    "product_id": "{{PRODUCT_ID}}",
    "cantidad_liberada": 3,
    "disponibilidad_final": 20
  }
}
```

### Pasos detallados

| # | Nodo n8n | Nombre | Configuración mínima |
|---|----------|--------|---------------------|
| 1 | **Kafka Trigger** | Consumir audit.log (batch) | Topic: `audit.log`, Group: `n8n-audit-export`, Batch: 100 msgs / 60s |
| 2 | **Function** | Enriquecer metadata | Agregar: `fecha_procesamiento`, `environment`, `version_schema`, `hash_integridad` |
| 3 | **Function** | Agrupar por servicio/hora | Crear archivos de log organizados para almacenamiento |
| 4 | **HTTP Request** | Exportar a MinIO | PUT `{{MINIO_AUDIT_PATH\|/storage/campaigns/audit/}}{servicio}/{fecha}/{hora}.jsonl` · Retry: 3 |
| 5 | **HTTP Request** | Traces a Jaeger (opcional) | POST `{{OTLP_HTTP_ENDPOINT\|http://jaeger:4318/v1/traces}}` spans construidos |
| 6 | **Function** | Métricas de auditoría | eventos_por_servicio, eventos_por_accion, latencia_procesamiento |

### Idempotencia
- Hash del batch content en Redis, TTL 6h

### DLQ y Reintentos
- **Reintentos**: 3, exponencial (5s, 10s, 20s)
- **DLQ**: `dead-letter.audit-trace-export`

### Formato de almacenamiento

```
/storage/campaigns/audit/
├── inventario/
│   └── 2026-02-09/
│       ├── 00.jsonl
│       ├── 01.jsonl
│       └── ...
├── pedidos/
│   └── 2026-02-09/
│       └── ...
└── entregas/
    └── ...
```

Cada archivo `.jsonl` contiene un evento JSON por línea, facilitando procesamiento con grep, jq, o Apache Spark.

### Runbook
1. **Eventos no se exportan**: Verificar consumer group. Verificar que otros workflows publiquen a `audit.log`.
2. **MinIO lleno**: Implementar política de retención (ej: 90 días). Archivar a S3 Glacier.
3. **Batch muy grande**: Ajustar batch size y timeout. Considerar particionamiento adicional.

### Checklist de Pruebas

- [x] **Happy Path**: 50 eventos de 3 servicios → archivos JSONL en MinIO agrupados, traces en Jaeger
- [x] **Fallo 1**: MinIO caído → batch completo a DLQ, alerta admin
- [x] **Fallo 2**: Evento malformado (sin accion) → descartado con warning, demás procesados

---

## Anexo A: Diagrama de Flujo de Eventos

```
┌──────────┐  order.created   ┌─────────────┐
│ Pedidos  │─────────────────▶│ WF-01 Orch  │───▶ Inventario (reserve)
│          │  payment.succeeded│             │───▶ Pedidos (pago)
│          │─────────────────▶│ WF-02 Pay   │───▶ Entregas (crear)
│          │                  │ WF-04 Ship  │───▶ notification.request
└──────────┘                  └──────┬──────┘
                                     │ order.orchestrated
                                     ▼
┌──────────┐  inventory        ┌─────────────┐
│Inventario│─────────────────▶│ WF-03 Stock │───▶ notification.request
└──────────┘  (stock.released) └─────────────┘

┌──────────┐  campana.activada ┌─────────────┐
│ Campañas │─────────────────▶│ WF-06 Camp  │───▶ notification.request
└──────────┘                  └─────────────┘

┌─────────────────────┐       ┌─────────────┐
│ notification.request│──────▶│ WF-05 Notif │───▶ SMTP / WhatsApp / Push
│                     │──────▶│ WF-07 Alert │───▶ Slack / email admin
└─────────────────────┘       └─────────────┘

┌──────────┐                  ┌─────────────┐
│ dead-letter.*       │──────▶│ WF-08 DLQ   │───▶ Republica / Escala
└──────────┘                  └─────────────┘

┌──────────┐                  ┌─────────────┐
│   Cron   │─────────────────▶│ WF-09 Sync  │───▶ MinIO / notification
└──────────┘                  └─────────────┘

┌──────────┐                  ┌─────────────┐
│ audit.log│─────────────────▶│ WF-10 Audit │───▶ MinIO / Jaeger
└──────────┘                  └─────────────┘
```

## Anexo B: Credenciales n8n (Credential Store)

| Nombre Credencial | Tipo | Uso |
|-------------------|------|-----|
| `InventarioAPIKey` | HTTP Header Auth | Bearer token para Inventario API |
| `PedidosAPIKey` / `PedidosPagoAPIKey` | HTTP Header Auth | Bearer token para Pedidos API |
| `EntregasAPIKey` | HTTP Header Auth | Bearer token para Entregas API |
| `CampañasAPIKey` | HTTP Header Auth | Bearer token para Campañas API |
| `UsuariosAPIKey` | HTTP Header Auth | Bearer token para Usuarios API |
| `RedisCredential` | Redis | Conexión a Redis para idempotencia |
| `SMTPCredential` | SMTP | Email saliente |
| `SlackCredential` | Slack OAuth2 | Alertas en canal admin |
| `WhatsAppAPICredential` | HTTP Header Auth | WhatsApp Business API |
| `MinIOCredential` | S3/MinIO | Almacenamiento de snapshots y audit |

## Anexo C: Variables de Entorno para n8n

```env
# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
N8N_CONSUMER_GROUP=n8n

# Redis
REDIS_URL=redis://redis:6379/0

# Topics (defaults — override si el código usa otros nombres)
ORDER_CREATED_TOPIC=order.created
PAYMENT_SUCCEEDED_TOPIC=payment.succeeded
STOCK_RELEASED_TOPIC=inventory
SHIPMENT_SCHEDULED_TOPIC=shipment.scheduled
NOTIFICATION_REQUEST_TOPIC=notification.request
ORDER_ORCHESTRATED_TOPIC=order.orchestrated
AUDIT_LOG_TOPIC=audit.log
CAMPAIGN_ACTIVATED_TOPIC=campana.activada

# DLQ Max retries
DLQ_MAX_RETRIES=3
DLQ_RETRY_DELAY_SECONDS=60

# Nightly Sync
NIGHTLY_SYNC_CRON=0 2 * * *
NIGHTLY_SYNC_TIMEZONE=America/Guayaquil

# Endpoints (internal Traefik routing)
INVENTORY_RESERVE_ENDPOINT=/api/inventory/{product_id}/reserve
INVENTORY_RELEASE_ENDPOINT=/api/inventory/{product_id}/release
INVENTORY_PRODUCT_ENDPOINT=/api/inventory/{product_id}
INVENTORY_LIST_ENDPOINT=/api/inventory/
ORDER_STATUS_ENDPOINT=/api/orders/{pedido_id}/estado
ORDER_DETAIL_ENDPOINT=/api/orders/{pedido_id}
ORDERS_LIST_ENDPOINT=/api/orders/
PAYMENT_CREATE_ENDPOINT=/api/orders/{pedido_id}/pago
DELIVERY_CREATE_ENDPOINT=/api/deliveries/
DELIVERY_VALIDATE_ZONE_ENDPOINT=/api/deliveries/validar-zona
DELIVERIES_LIST_ENDPOINT=/api/deliveries/
CAMPAIGN_DETAIL_ENDPOINT=/api/campaigns/{campana_id}
USERS_LIST_ENDPOINT=/api/users/

# Observability
OTLP_HTTP_ENDPOINT=http://jaeger:4318/v1/traces
ENVIRONMENT=production

# Admin
ADMIN_EMAIL=joscartinicioegc@gmail.com
```
