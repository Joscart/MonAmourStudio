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
  telefono?: string
  foto_url?: string | null
}

export interface PasswordChange {
  current_password: string
  new_password: string
}

export interface UsuarioResponse {
  id: string
  nombre: string
  email: string
  rol: string
  telefono: string | null
  foto_url: string | null
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
  disponibilidad?: number
  max_por_pedido?: number
  imagen_url?: string
  envio_gratis_umbral?: number | null
  tipo_producto_id?: string | null
  garantia_id?: string | null
  empaque_id?: string | null
  descuento_id?: string | null
  imagen_preview_url?: string | null
}

export interface ProductoUpdate {
  nombre?: string
  descripcion?: string
  precio?: number
  disponibilidad?: number
  max_por_pedido?: number
  imagen_url?: string
  envio_gratis_umbral?: number | null
  tipo_producto_id?: string | null
  garantia_id?: string | null
  empaque_id?: string | null
  descuento_id?: string | null
  imagen_preview_url?: string | null
}

export interface ProductoResponse {
  id: string
  sku: string
  nombre: string
  descripcion: string
  precio: number
  moneda: string
  disponibilidad: number
  max_por_pedido: number
  imagen_url: string | null
  envio_gratis_umbral: number | null
  imagen_preview_url: string | null
  calificacion_promedio: number
  total_resenas: number
  tipo_producto_id: string | null
  garantia_id: string | null
  empaque_id: string | null
  descuento_id: string | null
  tipo_producto_nombre: string | null
  garantia_nombre: string | null
  garantia_dias: number | null
  empaque_nombre: string | null
  descuento_nombre: string | null
  descuento_porcentaje: number | null
  tamanos: TamanoResponse[]
  created_at: string
}

// ── Tipos de producto ───────────────────────────────────────

export interface TipoProductoCreate {
  nombre: string
}

export interface TipoProductoResponse {
  id: string
  nombre: string
  created_at: string
}

// ── Garantías ─────────────────────────────────────────────────

export interface GarantiaCreate {
  nombre: string
  dias: number
}

export interface GarantiaResponse {
  id: string
  nombre: string
  dias: number
  created_at: string
}

// ── Empaques ──────────────────────────────────────────────────

export interface EmpaqueCreate {
  nombre: string
}

export interface EmpaqueResponse {
  id: string
  nombre: string
  created_at: string
}

// ── Descuentos ────────────────────────────────────────────────

export interface DescuentoCreate {
  nombre: string
  porcentaje: number
}

export interface DescuentoResponse {
  id: string
  nombre: string
  porcentaje: number
  created_at: string
}

// ── Tamaños ──────────────────────────────────────────────────

export interface TamanoCreate {
  nombre: string
  ancho_cm: number
  alto_cm: number
  precio_adicional?: number
}

export interface TamanoResponse {
  id: string
  producto_id: string
  nombre: string
  ancho_cm: number
  alto_cm: number
  precio_adicional: number
}

// ── Reseñas ─────────────────────────────────────────────────

export interface ResenaCreate {
  calificacion: number
  comentario?: string
}

export interface ResenaResponse {
  id: string
  producto_id: string
  usuario_id: string
  usuario_nombre: string
  calificacion: number
  comentario: string | null
  created_at: string
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
  max_por_pedido?: number
}

// ── Direcciones ─────────────────────────────────────────────

export interface DireccionCreate {
  etiqueta?: string
  linea1: string
  linea2?: string | null
  ciudad: string
  provincia: string
  codigo_postal: string
  pais?: string
  es_principal?: boolean
}

export interface DireccionUpdate {
  etiqueta?: string | null
  linea1?: string | null
  linea2?: string | null
  ciudad?: string | null
  provincia?: string | null
  codigo_postal?: string | null
  pais?: string | null
  es_principal?: boolean | null
}

export interface DireccionResponse {
  id: string
  usuario_id: string
  etiqueta: string
  linea1: string
  linea2: string | null
  ciudad: string
  provincia: string
  codigo_postal: string
  pais: string
  es_principal: boolean
  created_at: string
}

// ── Metodos de Pago ─────────────────────────────────────────

export interface MetodoPagoCreate {
  tipo?: string
  ultimos_4: string
  titular: string
  expiracion: string
  es_principal?: boolean
}

export interface MetodoPagoResponse {
  id: string
  usuario_id: string
  tipo: string
  ultimos_4: string
  titular: string
  expiracion: string
  es_principal: boolean
  created_at: string
}

// ── Favoritos ───────────────────────────────────────────────

export interface FavoritoResponse {
  id: string
  usuario_id: string
  producto_id: string
  created_at: string
}

// ── Configuración Tienda ───────────────────────────────────────────

export interface ConfiguracionTiendaUpdate {
  logo_url?: string | null
  email_contacto?: string | null
  email_soporte?: string | null
  telefono_contacto?: string | null
  telefono_soporte?: string | null
  envio_gratis_desde?: number | null
  costo_envio?: number | null
  instagram_url?: string | null
  tiktok_url?: string | null
  whatsapp_url?: string | null
  color_primary_h?: number
  color_primary_s?: number
  color_primary_l?: number
  color_accent_h?: number
  color_accent_s?: number
  color_accent_l?: number
}

export interface ConfiguracionTiendaResponse {
  id?: string | null
  logo_url: string | null
  email_contacto: string | null
  email_soporte: string | null
  telefono_contacto: string | null
  telefono_soporte: string | null
  envio_gratis_desde: number | null
  costo_envio: number | null
  instagram_url: string | null
  tiktok_url: string | null
  whatsapp_url: string | null
  color_primary_h: number
  color_primary_s: number
  color_primary_l: number
  color_accent_h: number
  color_accent_s: number
  color_accent_l: number
  created_at?: string | null
  updated_at?: string | null
}
