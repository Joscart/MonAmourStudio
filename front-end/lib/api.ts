/* ───────────────────────────────────────────────────────────
   API Client – all calls go through Traefik reverse-proxy
   /api/users/*       → usuarios:8000/usuarios/
   /api/inventory/*   → inventario:8000/productos/
   /api/orders/*      → pedidos:8000/pedidos/
   /api/deliveries/*  → entregas:8000/entregas/
   /api/campaigns/*   → campanas:8000/campanas/
   /api/publications/*→ campanas:8000/publicaciones/
   Dashboard: http://localhost:8080
   ─────────────────────────────────────────────────────────── */

import type {
  UsuarioCreate,
  LoginRequest,
  UsuarioUpdate,
  UsuarioResponse,
  TokenResponse,
  ProductoResponse,
  ProductoCreate,
  ProductoUpdate,
  PedidoCreate,
  PedidoResponse,
  PagoRequest,
  PagoResponse,
  EntregaResponse,
  CampanaResponse,
  EstadoUpdate,
} from "./types"

/* ── helpers ─────────────────────────────────────────────── */

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

/* ── Usuarios ────────────────────────────────────────────── */

export const usersApi = {
  register(data: UsuarioCreate) {
    return request<UsuarioResponse>("/api/users/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  login(data: LoginRequest) {
    return request<TokenResponse>("/api/users/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getMe() {
    return request<UsuarioResponse>("/api/users/me")
  },

  updateMe(data: UsuarioUpdate) {
    return request<UsuarioResponse>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  listAll() {
    return request<UsuarioResponse[]>("/api/users/")
  },

  deleteUser(userId: string) {
    return request<void>(`/api/users/${userId}`, { method: "DELETE" })
  },

  getUser(userId: string) {
    return request<UsuarioResponse>(`/api/users/${userId}`)
  },

  updateRole(userId: string, rol: string) {
    return request<UsuarioResponse>(`/api/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ rol }),
    })
  },
}

/* ── Inventario ──────────────────────────────────────────── */

export const inventoryApi = {
  list(params?: { search?: string; min_price?: number; max_price?: number; limit?: number; offset?: number }) {
    const qs = new URLSearchParams()
    if (params?.search) qs.set("search", params.search)
    if (params?.min_price != null) qs.set("min_price", String(params.min_price))
    if (params?.max_price != null) qs.set("max_price", String(params.max_price))
    if (params?.limit != null) qs.set("limit", String(params.limit))
    if (params?.offset != null) qs.set("offset", String(params.offset))
    const q = qs.toString()
    return request<ProductoResponse[]>(`/api/inventory/${q ? `?${q}` : ""}`)
  },

  get(productId: string) {
    return request<ProductoResponse>(`/api/inventory/${productId}`)
  },

  create(data: ProductoCreate) {
    return request<ProductoResponse>("/api/inventory/", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update(productId: string, data: ProductoUpdate) {
    return request<ProductoResponse>(`/api/inventory/${productId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete(productId: string) {
    return request<void>(`/api/inventory/${productId}`, { method: "DELETE" })
  },
}

/* ── Pedidos ─────────────────────────────────────────────── */

export const ordersApi = {
  create(data: PedidoCreate) {
    return request<PedidoResponse>("/api/orders/", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  list() {
    return request<PedidoResponse[]>("/api/orders/")
  },

  get(pedidoId: string) {
    return request<PedidoResponse>(`/api/orders/${pedidoId}`)
  },

  updateStatus(pedidoId: string, data: EstadoUpdate) {
    return request<PedidoResponse>(`/api/orders/${pedidoId}/estado`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  pay(pedidoId: string, data: PagoRequest) {
    return request<PagoResponse>(`/api/orders/${pedidoId}/pago`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}

/* ── Entregas ────────────────────────────────────────────── */

export const deliveriesApi = {
  list() {
    return request<EntregaResponse[]>("/api/deliveries/")
  },

  get(entregaId: string) {
    return request<EntregaResponse>(`/api/deliveries/${entregaId}`)
  },

  getByOrder(pedidoId: string) {
    return request<EntregaResponse>(`/api/deliveries/pedido/${pedidoId}`)
  },
}

/* ── Campañas ────────────────────────────────────────────── */

export const campaignsApi = {
  list() {
    return request<CampanaResponse[]>("/api/campaigns/")
  },

  get(campanaId: string) {
    return request<CampanaResponse>(`/api/campaigns/${campanaId}`)
  },
}
