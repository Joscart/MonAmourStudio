/* ───────────────────────────────────────────────────────────
   TypeScript types matching backend Pydantic schemas
   ─────────────────────────────────────────────────────────── */

// ── Usuarios ────────────────────────────────────────────────

export interface UsuarioCreate {
  nombre: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UsuarioUpdate {
  nombre?: string
  email?: string
}

export interface UsuarioResponse {
  id: string
  nombre: string
  email: string
  rol: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ── Inventario ──────────────────────────────────────────────

export interface ProductoCreate {
  sku: string
  nombre: string
  descripcion: string
  precio: number
  moneda?: string
  stock?: number
  imagen_url?: string
}

export interface ProductoUpdate {
  nombre?: string
  descripcion?: string
  precio?: number
  stock?: number
  imagen_url?: string
}

export interface ProductoResponse {
  id: string
  sku: string
  nombre: string
  descripcion: string
  precio: number
  moneda: string
  stock: number
  imagen_url: string | null
  created_at: string
  updated_at: string
}

// ── Pedidos ─────────────────────────────────────────────────

export interface PedidoItemCreate {
  producto_id: string
  variante?: string
  cantidad: number
  precio_unitario: number
}

export interface PedidoCreate {
  items: PedidoItemCreate[]
  direccion_entrega: string
  coordenadas_entrega?: string
}

export interface PedidoItemResponse {
  id: string
  producto_id: string
  variante: string | null
  cantidad: number
  precio_unitario: number
}

export interface PedidoResponse {
  id: string
  usuario_id: string
  fecha_creacion: string
  estado: string
  subtotal: number
  shipping: number
  total: number
  direccion_entrega: string
  coordenadas_entrega: string | null
  items: PedidoItemResponse[]
  created_at: string
  updated_at: string
}

export interface PagoRequest {
  monto: number
  metodo_pago?: string
}

export interface PagoResponse {
  ok: boolean
  mensaje: string
  referencia: string
}

export interface EstadoUpdate {
  estado: string
}

// ── Entregas ────────────────────────────────────────────────

export interface EntregaResponse {
  id: string
  pedido_id: string
  estado: string
  guia: string
  fecha_programada: string | null
  fecha_entrega: string | null
  direccion: string
  notas: string | null
  created_at: string
  updated_at: string
}

// ── Campañas ────────────────────────────────────────────────

export interface CampanaResponse {
  id: string
  titulo: string
  mensaje_global: string
  segmentacion: string | null
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  created_at: string
  updated_at: string
  publicaciones_count: number
}

// ── Frontend Cart ───────────────────────────────────────────

export interface CartItem {
  id: string
  nombre: string
  precio: number
  imagen_url: string | null
  cantidad: number
  sku: string
}
