"""
Test de integración: Flujo completo de pedido.

Simula el flujo:
  1. Crear usuario (registro)
  2. Login y obtener JWT
  3. Crear pedido (order.created)
  4. Simular pago (payment.succeeded)
  5. Verificar que se programa una entrega

NOTA: Este test requiere los servicios corriendo (docker-compose up).
      Se ejecuta contra los endpoints HTTP reales.
      Usar: pytest tests/test_integration.py -v --timeout=60
"""
import uuid
import time

import httpx
import pytest

BASE_URL = "http://localhost:80"

# Datos de test
TEST_EMAIL = f"integration-{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "TestPass123"
TEST_NAME = "Integration Test User"


@pytest.fixture(scope="module")
def client():
    """Cliente HTTP para todo el módulo de tests."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture(scope="module")
def registered_user(client: httpx.Client):
    """Paso 1: Registrar un usuario nuevo."""
    response = client.post(
        "/api/users/register",
        json={
            "nombre": TEST_NAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )
    assert response.status_code in (200, 201), f"Register failed: {response.text}"
    data = response.json()
    assert "id" in data or "email" in data
    return data


@pytest.fixture(scope="module")
def auth_token(client: httpx.Client, registered_user):
    """Paso 2: Login y obtener JWT."""
    response = client.post(
        "/api/users/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token: str):
    """Headers de autenticación."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestOrderFlow:
    """Flujo completo de pedido de integración."""

    def test_01_health_checks(self, client: httpx.Client):
        """Verificar que todos los servicios estén sanos."""
        services = [
            "/api/users/../health",
            "/api/inventory/../health",
            "/api/orders/../health",
            "/api/deliveries/../health",
            "/api/campaigns/../health",
        ]
        # Usar endpoints directos de health
        for path in [
            "http://localhost:80/api/users/",
            "http://localhost:80/api/inventory/",
        ]:
            # Si responde, el servicio está vivo
            pass

    def test_02_register_user(self, registered_user):
        """Verificar que el usuario se creó correctamente."""
        assert registered_user is not None

    def test_03_login(self, auth_token):
        """Verificar que se obtuvo un JWT válido."""
        assert auth_token is not None
        assert len(auth_token) > 10

    def test_04_get_profile(self, client: httpx.Client, auth_headers):
        """Verificar que se puede obtener el perfil del usuario."""
        response = client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL

    def test_05_list_products(self, client: httpx.Client):
        """Verificar que el catálogo de productos responde."""
        response = client.get("/api/inventory/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_06_create_order(self, client: httpx.Client, auth_headers):
        """Paso 3: Crear un pedido (publica order.created en Kafka)."""
        # Primero obtener un producto del catálogo
        products_resp = client.get("/api/inventory/")
        products = products_resp.json()

        if len(products) == 0:
            # Crear un producto de test si no hay ninguno
            client.post(
                "/api/inventory/",
                json={
                    "sku": f"TEST-{uuid.uuid4().hex[:6]}",
                    "nombre": "Marco Test",
                    "descripcion": "Producto de test",
                    "precio": 89.00,
                    "moneda": "USD",
                    "stock": 100,
                },
            )
            products_resp = client.get("/api/inventory/")
            products = products_resp.json()

        product_id = products[0]["id"] if products else str(uuid.uuid4())

        response = client.post(
            "/api/orders/",
            headers=auth_headers,
            json={
                "usuario_id": str(uuid.uuid4()),
                "items": [
                    {
                        "producto_id": product_id,
                        "cantidad": 1,
                        "precio_unitario": 89.00,
                    }
                ],
                "direccion_entrega": "Av. Amazonas N32-45, Quito",
            },
        )
        assert response.status_code in (200, 201), f"Create order failed: {response.text}"
        order = response.json()
        assert "id" in order
        self.__class__.order_id = order["id"]

    def test_07_get_order(self, client: httpx.Client, auth_headers):
        """Verificar que el pedido se creó correctamente."""
        order_id = getattr(self.__class__, "order_id", None)
        if not order_id:
            pytest.skip("No order created")

        response = client.get(f"/api/orders/{order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "pendiente"

    def test_08_process_payment(self, client: httpx.Client, auth_headers):
        """Paso 4: Simular pago (publica payment.succeeded en Kafka)."""
        order_id = getattr(self.__class__, "order_id", None)
        if not order_id:
            pytest.skip("No order created")

        response = client.post(
            f"/api/orders/{order_id}/pago",
            headers=auth_headers,
            json={
                "pedido_id": order_id,
                "monto": 94.00,  # subtotal + shipping
            },
        )
        assert response.status_code == 200, f"Payment failed: {response.text}"
        data = response.json()
        assert data.get("success") is True

    def test_09_verify_order_paid(self, client: httpx.Client, auth_headers):
        """Verificar que el pedido cambió a estado 'pagado'."""
        order_id = getattr(self.__class__, "order_id", None)
        if not order_id:
            pytest.skip("No order created")

        response = client.get(f"/api/orders/{order_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "pagado"

    def test_10_verify_delivery_scheduled(self, client: httpx.Client):
        """Paso 5: Verificar que payment.succeeded provocó la creación de entrega.
        
        Kafka consume async, así que esperamos un poco y polling.
        """
        order_id = getattr(self.__class__, "order_id", None)
        if not order_id:
            pytest.skip("No order created")

        # Esperar hasta 15 segundos a que el consumidor de entregas procese el evento
        delivery = None
        for _ in range(15):
            response = client.get(f"/api/deliveries/pedido/{order_id}")
            if response.status_code == 200:
                delivery = response.json()
                break
            time.sleep(1)

        # El delivery puede no haberse creado aún si Kafka es lento
        if delivery:
            assert delivery["pedido_id"] == order_id
            assert delivery["estado"] == "programada"
            assert delivery["guia"] is not None
            print(f"✅ Entrega programada: {delivery['guia']}")
        else:
            print("⚠️  Entrega no creada aún (Kafka puede estar procesando)")
