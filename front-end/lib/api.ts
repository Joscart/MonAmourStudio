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
  TipoProductoResponse,
  TipoProductoCreate,
  GarantiaResponse,
  GarantiaCreate,
  EmpaqueResponse,
  EmpaqueCreate,
  DescuentoResponse,
  DescuentoCreate,
  TamanoResponse,
  TamanoCreate,
  ResenaCreate,
  ResenaResponse,
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

/** Ensure numeric fields are actual numbers (PostgreSQL DECIMAL comes as string) */
function normalizeProduct(p: ProductoResponse): ProductoResponse {
  return {
    ...p,
    precio: Number(p.precio),
    disponibilidad: Number(p.disponibilidad),
    max_por_pedido: Number(p.max_por_pedido),
    envio_gratis_umbral: p.envio_gratis_umbral != null ? Number(p.envio_gratis_umbral) : null,
    calificacion_promedio: Number(p.calificacion_promedio),
    total_resenas: Number(p.total_resenas),
    garantia_dias: p.garantia_dias != null ? Number(p.garantia_dias) : null,
    descuento_porcentaje: p.descuento_porcentaje != null ? Number(p.descuento_porcentaje) : null,
    tamanos: (p.tamanos ?? []).map(t => ({
      ...t,
      ancho_cm: Number(t.ancho_cm),
      alto_cm: Number(t.alto_cm),
      precio_adicional: Number(t.precio_adicional),
    })),
  }
}

export const inventoryApi = {
  async list(params?: { search?: string; min_price?: number; max_price?: number; limit?: number; offset?: number }) {
    const qs = new URLSearchParams()
    if (params?.search) qs.set("search", params.search)
    if (params?.min_price != null) qs.set("min_price", String(params.min_price))
    if (params?.max_price != null) qs.set("max_price", String(params.max_price))
    if (params?.limit != null) qs.set("limit", String(params.limit))
    if (params?.offset != null) qs.set("offset", String(params.offset))
    const q = qs.toString()
    const items = await request<ProductoResponse[]>(`/api/inventory/${q ? `?${q}` : ""}`)
    return items.map(normalizeProduct)
  },

  async get(productId: string) {
    const item = await request<ProductoResponse>(`/api/inventory/${productId}`)
    return normalizeProduct(item)
  },

  async create(data: ProductoCreate) {
    const item = await request<ProductoResponse>("/api/inventory/", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return normalizeProduct(item)
  },

  async update(productId: string, data: ProductoUpdate) {
    const item = await request<ProductoResponse>(`/api/inventory/${productId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return normalizeProduct(item)
  },

  delete(productId: string) {
    return request<void>(`/api/inventory/${productId}`, { method: "DELETE" })
  },

  async uploadImage(file: File): Promise<{ url: string; object_name: string }> {
    const formData = new FormData()
    formData.append("file", file)

    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch("/api/inventory/upload", {
      method: "POST",
      headers,
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body.detail ?? res.statusText)
    }

    return res.json()
  },
}

/* ── Tipos de producto ───────────────────────────────────── */

export const productTypesApi = {
  list() {
    return request<TipoProductoResponse[]>("/api/inventory/tipos")
  },

  create(data: TipoProductoCreate) {
    return request<TipoProductoResponse>("/api/inventory/tipos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  delete(tipoId: string) {
    return request<void>(`/api/inventory/tipos/${tipoId}`, { method: "DELETE" })
  },
}

/* ── Garantías ─────────────────────────────────────────────── */

export const warrantyApi = {
  list() {
    return request<GarantiaResponse[]>("/api/inventory/garantias")
  },
  create(data: GarantiaCreate) {
    return request<GarantiaResponse>("/api/inventory/garantias", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  delete(id: string) {
    return request<void>(`/api/inventory/garantias/${id}`, { method: "DELETE" })
  },
}

/* ── Empaques ──────────────────────────────────────────────── */

export const packagingApi = {
  list() {
    return request<EmpaqueResponse[]>("/api/inventory/empaques")
  },
  create(data: EmpaqueCreate) {
    return request<EmpaqueResponse>("/api/inventory/empaques", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  delete(id: string) {
    return request<void>(`/api/inventory/empaques/${id}`, { method: "DELETE" })
  },
}

/* ── Descuentos ────────────────────────────────────────────── */

export const discountsApi = {
  list() {
    return request<DescuentoResponse[]>("/api/inventory/descuentos")
  },
  create(data: DescuentoCreate) {
    return request<DescuentoResponse>("/api/inventory/descuentos", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  delete(id: string) {
    return request<void>(`/api/inventory/descuentos/${id}`, { method: "DELETE" })
  },
}

/* ── Tamaños (per product) ─────────────────────────────────── */

export const sizesApi = {
  list(productId: string) {
    return request<TamanoResponse[]>(`/api/inventory/${productId}/tamanos`)
  },
  create(productId: string, data: TamanoCreate) {
    return request<TamanoResponse>(`/api/inventory/${productId}/tamanos`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  delete(productId: string, tamanoId: string) {
    return request<void>(`/api/inventory/${productId}/tamanos/${tamanoId}`, {
      method: "DELETE",
    })
  },
}

/* ── Reseñas ─────────────────────────────────────────────── */

export const reviewsApi = {
  list(productId: string) {
    return request<ResenaResponse[]>(`/api/inventory/${productId}/resenas`)
  },

  create(productId: string, data: ResenaCreate, userId: string, userName: string) {
    return request<ResenaResponse>(`/api/inventory/${productId}/resenas`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "X-User-Id": userId,
        "X-User-Name": userName,
      },
    })
  },

  delete(productId: string, resenaId: string) {
    return request<void>(`/api/inventory/${productId}/resenas/${resenaId}`, {
      method: "DELETE",
    })
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
