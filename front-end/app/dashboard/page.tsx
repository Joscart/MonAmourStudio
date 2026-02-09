"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { inventoryApi, ordersApi, usersApi, productTypesApi, warrantyApi, packagingApi, discountsApi, sizesApi, storeConfigApi } from "@/lib/api"
import type { ProductoResponse, PedidoResponse, UsuarioResponse, TipoProductoResponse, GarantiaResponse, EmpaqueResponse, DescuentoResponse, ConfiguracionTiendaResponse } from "@/lib/types"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
  Eye,
  Search,
  Plus,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  BarChart3,
  Calendar,
  Loader2,
  Shield,
  ShieldCheck,
  Lock,
  X as XIcon,
  Save,
  AlertTriangle,
  Upload,
  Star,
  Tag,
  Palette,
  Instagram,
  Globe,
  MessageCircle,
  Phone,
  Mail,
} from "lucide-react"
import { useStoreConfig } from "@/contexts/store-config-context"

const menuItems = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
  { id: "productos", label: "Productos", icon: Package },
  { id: "catalogo", label: "Catalogo", icon: Tag },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "estadisticas", label: "Estadisticas", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

/* ── Color conversion helpers ──────────────────────────────── */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100, lN = l / 100
  const a = sN * Math.min(lN, 1 - lN)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = lN - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const [activeSection, setActiveSection] = useState("resumen")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderFilter, setOrderFilter] = useState("todos")

  const [products, setProducts] = useState<ProductoResponse[]>([])
  const [orders, setOrders] = useState<PedidoResponse[]>([])
  const [customers, setCustomers] = useState<UsuarioResponse[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<UsuarioResponse | null>(null)
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Product CRUD state ─────────────────────────────────────
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductoResponse | null>(null)
  const [productForm, setProductForm] = useState({
    sku: "",
    nombre: "",
    descripcion: "",
    precio: "",
    moneda: "USD",
    disponibilidad: "",
    max_por_pedido: "1",
    imagen_url: "",
    envio_gratis_umbral: "" as string,
    tipo_producto_id: "" as string,
    garantia_id: "" as string,
    empaque_id: "" as string,
    descuento_id: "" as string,
  })
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Catalog state (lookup tables) ──────────────────────────
  const [tipos, setTipos] = useState<TipoProductoResponse[]>([])
  const [garantias, setGarantias] = useState<GarantiaResponse[]>([])
  const [empaques, setEmpaques] = useState<EmpaqueResponse[]>([])
  const [descuentos, setDescuentos] = useState<DescuentoResponse[]>([])
  const [catalogInput, setCatalogInput] = useState({ nombre: "", dias: "", porcentaje: "" })
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Inline-creation state for product form dropdowns
  const [inlineCreating, setInlineCreating] = useState<null | "tipo" | "garantia" | "empaque" | "descuento">(null)
  const [inlineInput, setInlineInput] = useState({ nombre: "", dias: "", porcentaje: "" })

  // ── Store config state (ajustes) ───────────────────────────
  const { config: storeConfig, refresh: refreshStoreConfig } = useStoreConfig()
  const [storeForm, setStoreForm] = useState({
    email_contacto: "",
    email_soporte: "",
    telefono_contacto: "",
    telefono_soporte: "",
    envio_gratis_desde: "",
    costo_envio: "",
    instagram_url: "",
    tiktok_url: "",
    whatsapp_url: "",
  })
  const [storeColorForm, setStoreColorForm] = useState({
    primaryColor: "#d4748b",
    accentColor: "#d4a017",
  })
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [storeSuccess, setStoreSuccess] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
    if (!isAuthenticated) return
    setIsLoading(true)
    Promise.all([
      inventoryApi.list(),
      ordersApi.list(),
      usersApi.listAll().catch(() => [] as UsuarioResponse[]),
      productTypesApi.list().catch(() => [] as TipoProductoResponse[]),
      warrantyApi.list().catch(() => [] as GarantiaResponse[]),
      packagingApi.list().catch(() => [] as EmpaqueResponse[]),
      discountsApi.list().catch(() => [] as DescuentoResponse[]),
    ])
      .then(([prods, ords, custs, tps, gars, emps, descs]) => {
        setProducts(prods)
        setOrders(ords)
        setCustomers(custs)
        setTipos(tps)
        setGarantias(gars)
        setEmpaques(emps)
        setDescuentos(descs)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [authLoading, isAuthenticated, router])

  // Sync store config into form when loaded
  useEffect(() => {
    setStoreForm({
      email_contacto: storeConfig.email_contacto ?? "",
      email_soporte: storeConfig.email_soporte ?? "",
      telefono_contacto: storeConfig.telefono_contacto ?? "",
      telefono_soporte: storeConfig.telefono_soporte ?? "",
      envio_gratis_desde: storeConfig.envio_gratis_desde != null ? String(storeConfig.envio_gratis_desde) : "",
      costo_envio: storeConfig.costo_envio != null ? String(storeConfig.costo_envio) : "",
      instagram_url: storeConfig.instagram_url ?? "",
      tiktok_url: storeConfig.tiktok_url ?? "",
      whatsapp_url: storeConfig.whatsapp_url ?? "",
    })
    setStoreColorForm({
      primaryColor: hslToHex(storeConfig.color_primary_h, storeConfig.color_primary_s, storeConfig.color_primary_l),
      accentColor: hslToHex(storeConfig.color_accent_h, storeConfig.color_accent_s, storeConfig.color_accent_l),
    })
    setLogoPreview(storeConfig.logo_url ?? null)
  }, [storeConfig])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "entregado":
        return "bg-green-100 text-green-700"
      case "enviado":
        return "bg-blue-100 text-blue-700"
      case "procesando":
        return "bg-yellow-100 text-yellow-700"
      case "confirmado":
        return "bg-cyan-100 text-cyan-700"
      case "pendiente":
        return "bg-orange-100 text-orange-700"
      case "cancelado":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getDisponibilidadStatus = (disponibilidad: number) => {
    if (disponibilidad === 0) return { label: "No Disponible", class: "bg-red-100 text-red-700" }
    if (disponibilidad < 5) return { label: "Baja Disp.", class: "bg-yellow-100 text-yellow-700" }
    return { label: "Disponible", class: "bg-green-100 text-green-700" }
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)

  // ── Product CRUD handlers ──────────────────────────────────
  const resetProductForm = () => {
    setProductForm({
      sku: "",
      nombre: "",
      descripcion: "",
      precio: "",
      moneda: "USD",
      disponibilidad: "",
      max_por_pedido: "1",
      imagen_url: "",
      envio_gratis_umbral: "",
      tipo_producto_id: "",
      garantia_id: "",
      empaque_id: "",
      descuento_id: "",
    })
    setEditingProduct(null)
    setProductError(null)
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const openCreateProduct = () => {
    resetProductForm()
    setShowProductForm(true)
  }

  const openEditProduct = (product: ProductoResponse) => {
    setEditingProduct(product)
    setProductForm({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion || "",
      precio: String(product.precio),
      moneda: product.moneda,
      disponibilidad: String(product.disponibilidad),
      max_por_pedido: String(product.max_por_pedido),
      imagen_url: product.imagen_url || "",
      envio_gratis_umbral: product.envio_gratis_umbral != null ? String(product.envio_gratis_umbral) : "",
      tipo_producto_id: product.tipo_producto_id || "",
      garantia_id: product.garantia_id || "",
      empaque_id: product.empaque_id || "",
      descuento_id: product.descuento_id || "",
    })
    setProductError(null)
    setShowProductForm(true)
    setImageFile(null)
    setImagePreview(product.imagen_url || null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSaveProduct = async () => {
    setProductError(null)
    if (!productForm.sku.trim() || !productForm.nombre.trim() || !productForm.precio) {
      setProductError("SKU, nombre y precio son obligatorios.")
      return
    }
    const precio = parseFloat(productForm.precio)
    if (isNaN(precio) || precio < 0) {
      setProductError("El precio debe ser un numero valido >= 0.")
      return
    }
    const disponibilidad = productForm.disponibilidad ? parseInt(productForm.disponibilidad, 10) : 0
    const max_por_pedido = productForm.max_por_pedido ? parseInt(productForm.max_por_pedido, 10) : 1
    if (isNaN(disponibilidad) || disponibilidad < 0) {
      setProductError("La disponibilidad debe ser un numero >= 0.")
      return
    }
    if (isNaN(max_por_pedido) || max_por_pedido < 1) {
      setProductError("El maximo por pedido debe ser al menos 1.")
      return
    }
    if (max_por_pedido > disponibilidad && disponibilidad > 0) {
      setProductError("El maximo por pedido no puede superar la disponibilidad total.")
      return
    }

    setProductSaving(true)
    try {
      // Upload image if a new file was selected
      let finalImageUrl = productForm.imagen_url || undefined
      if (imageFile) {
        setImageUploading(true)
        try {
          const uploadResult = await inventoryApi.uploadImage(imageFile)
          finalImageUrl = uploadResult.url
        } catch (err: any) {
          setProductError(err.message || "Error al subir la imagen.")
          setProductSaving(false)
          setImageUploading(false)
          return
        }
        setImageUploading(false)
      }

      if (editingProduct) {
        const updated = await inventoryApi.update(editingProduct.id, {
          nombre: productForm.nombre,
          descripcion: productForm.descripcion || undefined,
          precio,
          disponibilidad,
          max_por_pedido,
          imagen_url: finalImageUrl,
          envio_gratis_umbral: productForm.envio_gratis_umbral ? parseFloat(productForm.envio_gratis_umbral) : null,
          tipo_producto_id: productForm.tipo_producto_id || null,
          garantia_id: productForm.garantia_id || null,
          empaque_id: productForm.empaque_id || null,
          descuento_id: productForm.descuento_id || null,
        })
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await inventoryApi.create({
          sku: productForm.sku,
          nombre: productForm.nombre,
          descripcion: productForm.descripcion,
          precio,
          moneda: productForm.moneda,
          disponibilidad,
          max_por_pedido,
          imagen_url: finalImageUrl,
          envio_gratis_umbral: productForm.envio_gratis_umbral ? parseFloat(productForm.envio_gratis_umbral) : null,
          tipo_producto_id: productForm.tipo_producto_id || null,
          garantia_id: productForm.garantia_id || null,
          empaque_id: productForm.empaque_id || null,
          descuento_id: productForm.descuento_id || null,
        })
        setProducts((prev) => [created, ...prev])
      }
      setShowProductForm(false)
      resetProductForm()
    } catch (err: any) {
      setProductError(err.message || "Error al guardar producto.")
    } finally {
      setProductSaving(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este producto? Esta accion es irreversible.")) return
    try {
      await inventoryApi.delete(productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch {
      // silently fail
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.nombre.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()),
  )

  const defaultAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase()
  const isDefaultAdmin = (email: string) => defaultAdminEmail !== "" && email.toLowerCase() === defaultAdminEmail

  const filteredCustomers = customers.filter(
    (c) =>
      c.nombre.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase()),
  )

  const handleRoleChange = async (userId: string, newRole: string) => {
    setCustomerError(null)
    setRoleUpdating(userId)
    try {
      const updated = await usersApi.updateRole(userId, newRole)
      setCustomers((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, rol: updated.rol } : c)),
      )
      if (selectedCustomer?.id === userId) {
        setSelectedCustomer((prev) => (prev ? { ...prev, rol: updated.rol } : prev))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cambiar rol"
      setCustomerError(msg.includes("403") || msg.includes("default") ? "No se puede cambiar el rol del administrador por defecto" : msg)
    } finally {
      setRoleUpdating(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setCustomerError(null)
    if (!confirm("¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.")) return
    try {
      await usersApi.deleteUser(userId)
      setCustomers((prev) => prev.filter((c) => c.id !== userId))
      if (selectedCustomer?.id === userId) setSelectedCustomer(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar usuario"
      setCustomerError(msg.includes("403") || msg.includes("default") ? "No se puede eliminar al administrador por defecto" : msg)
    }
  }
  const pendingOrders = orders.filter((o) =>
    ["pendiente", "confirmado", "procesando"].includes(o.estado),
  ).length

  const statsCards = [
    { label: "Ingresos Totales", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign },
    { label: "Pedidos Totales", value: String(orders.length), icon: ShoppingCart },
    { label: "Clientes", value: String(customers.length), icon: Users },
    { label: "Productos", value: String(products.length), icon: Package },
  ]

  const filteredOrders =
    orderFilter === "todos"
      ? orders
      : orders.filter((o) => o.estado === orderFilter)

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return iso
    }
  }

  if (isLoading || authLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
              Panel de Administracion
            </h1>
            <p className="text-muted-foreground">
              Bienvenido, {user?.nombre ?? "Administrador"}. Gestiona tu tienda desde aqui.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-4 sticky top-24">
                {/* Admin Info */}
                <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
                  {user?.foto_url ? (
                    <Image src={user.foto_url} alt={user.nombre || ""} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-accent-foreground font-bold text-lg">
                        {user?.nombre?.charAt(0)?.toUpperCase() ?? "A"}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{user?.nombre ?? "Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
                  </div>
                </div>

                {/* Menu */}
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      router.push("/")
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors mt-4"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesion
                  </button>
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-4">
              {/* Dashboard Overview */}
              {activeSection === "resumen" && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statsCards.map((stat) => (
                      <div key={stat.label} className="bg-card rounded-lg border border-border p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <stat.icon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-card rounded-lg border border-border">
                    <div className="p-5 border-b border-border flex items-center justify-between">
                      <h2 className="font-serif text-lg text-foreground">Pedidos Recientes</h2>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-transparent"
                        onClick={() => setActiveSection("pedidos")}
                      >
                        Ver Todos
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">ID Pedido</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Items</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Fecha</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Total</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {orders.slice(0, 5).map((order) => (
                            <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-5 py-4 text-sm font-medium text-foreground">{order.id.slice(0, 8)}</td>
                              <td className="px-5 py-4 text-sm text-foreground">{order.items.length}</td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(order.fecha_creacion)}</td>
                              <td className="px-5 py-4 text-sm font-medium text-foreground">${Number(order.total).toFixed(2)}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>
                                  {order.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {orders.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                No hay pedidos registrados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => setActiveSection("productos")}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Agregar Producto</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-center gap-2 bg-transparent"
                      onClick={() => setActiveSection("pedidos")}
                    >
                      <Package className="h-5 w-5" />
                      <span>Gestionar Pedidos</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-center gap-2 bg-transparent"
                      onClick={() => setActiveSection("estadisticas")}
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span>Ver Reportes</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Orders Section */}
              {activeSection === "pedidos" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="font-serif text-xl text-foreground">Gestion de Pedidos</h2>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar pedido..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-card border-border"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={orderFilter}
                          onChange={(e) => setOrderFilter(e.target.value)}
                          className="appearance-none bg-card border border-border rounded-md px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="todos">Todos</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="procesando">Procesando</option>
                          <option value="enviado">Enviado</option>
                          <option value="entregado">Entregado</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">ID</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Direccion</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Fecha</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Items</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Total</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-5 py-4 text-sm font-medium text-foreground">{order.id.slice(0, 8)}</td>
                              <td className="px-5 py-4">
                                <p className="text-sm text-foreground truncate max-w-[180px]" title={order.direccion_entrega}>
                                  {order.direccion_entrega}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(order.fecha_creacion)}</td>
                              <td className="px-5 py-4 text-sm text-foreground">{order.items.length}</td>
                              <td className="px-5 py-4 text-sm font-medium text-foreground">${Number(order.total).toFixed(2)}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>
                                  {order.estado}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredOrders.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                No hay pedidos para mostrar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Section */}
              {activeSection === "productos" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="font-serif text-xl text-foreground">Gestion de Productos</h2>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar producto..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="pl-10 bg-card border-border"
                        />
                      </div>
                      <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={openCreateProduct}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>

                  {/* Product Form (Create / Edit) */}
                  {showProductForm && (
                    <div className="bg-card rounded-lg border border-border p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-serif text-lg text-foreground">
                          {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                        </h3>
                        <button
                          type="button"
                          onClick={() => { setShowProductForm(false); resetProductForm() }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {productError && (
                        <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3 mb-4">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {productError}
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">SKU *</label>
                          <Input
                            value={productForm.sku}
                            onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                            placeholder="FRAME-001"
                            className="bg-background border-border"
                            disabled={!!editingProduct}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Nombre *</label>
                          <Input
                            value={productForm.nombre}
                            onChange={(e) => setProductForm((f) => ({ ...f, nombre: e.target.value }))}
                            placeholder="Marco Romance Dorado"
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium text-foreground">Descripcion</label>
                          <textarea
                            value={productForm.descripcion}
                            onChange={(e) => setProductForm((f) => ({ ...f, descripcion: e.target.value }))}
                            placeholder="Descripcion del producto..."
                            rows={3}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Precio (USD) *</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.precio}
                            onChange={(e) => setProductForm((f) => ({ ...f, precio: e.target.value }))}
                            placeholder="89.00"
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Moneda</label>
                          <Input
                            value={productForm.moneda}
                            onChange={(e) => setProductForm((f) => ({ ...f, moneda: e.target.value }))}
                            placeholder="USD"
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Disponibilidad Total
                            <span className="text-xs text-muted-foreground ml-1">(unidades)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={productForm.disponibilidad}
                            onChange={(e) => setProductForm((f) => ({ ...f, disponibilidad: e.target.value }))}
                            placeholder="50"
                            className="bg-background border-border"
                          />
                          <p className="text-xs text-muted-foreground">
                            Cantidad total disponible para venta.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Max. por Pedido
                            <span className="text-xs text-muted-foreground ml-1">(limite)</span>
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={productForm.max_por_pedido}
                            onChange={(e) => setProductForm((f) => ({ ...f, max_por_pedido: e.target.value }))}
                            placeholder="3"
                            className="bg-background border-border"
                          />
                          <p className="text-xs text-muted-foreground">
                            Cantidad maxima que un cliente puede pedir por orden.
                          </p>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium text-foreground">Imagen del Producto</label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setImageFile(file)
                                const reader = new FileReader()
                                reader.onload = (ev) => setImagePreview(ev.target?.result as string)
                                reader.readAsDataURL(file)
                              }
                            }}
                          />

                          {imagePreview ? (
                            <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg border border-border">
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                                <Image
                                  src={imagePreview}
                                  alt="Vista previa"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                {imageFile ? (
                                  <>
                                    <p className="text-sm font-medium text-foreground truncate">{imageFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Imagen actual</p>
                                )}
                                {imageUploading && (
                                  <div className="flex items-center gap-2 mt-1 text-primary text-xs">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Subiendo...
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="bg-transparent"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  Cambiar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="bg-transparent text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setImageFile(null)
                                    setImagePreview(null)
                                    setProductForm((f) => ({ ...f, imagen_url: "" }))
                                    if (fileInputRef.current) fileInputRef.current.value = ""
                                  }}
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors group"
                            >
                              <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                <Upload className="h-8 w-8" />
                                <span className="text-sm font-medium">Haz clic para subir una imagen</span>
                                <span className="text-xs">JPG, PNG, WebP o GIF — Max 10 MB</span>
                              </div>
                            </button>
                          )}
                        </div>

                        {/* New FK select fields with inline creation */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Tipo de Producto</label>
                          <div className="flex gap-2">
                            <select
                              value={productForm.tipo_producto_id}
                              onChange={(e) => setProductForm((f) => ({ ...f, tipo_producto_id: e.target.value }))}
                              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Sin tipo</option>
                              {tipos.map((t) => (<option key={t.id} value={t.id}>{t.nombre}</option>))}
                            </select>
                            <Button type="button" variant="outline" size="sm" className="bg-transparent h-9 w-9 p-0 flex-shrink-0" onClick={() => { setInlineCreating("tipo"); setInlineInput({ nombre: "", dias: "", porcentaje: "" }) }}><Plus className="h-4 w-4" /></Button>
                          </div>
                          {inlineCreating === "tipo" && (
                            <div className="flex gap-2 items-center p-2 bg-secondary/30 rounded-md border border-border">
                              <Input placeholder="Nombre del tipo..." value={inlineInput.nombre} onChange={(e) => setInlineInput((v) => ({ ...v, nombre: e.target.value }))} className="bg-background border-border h-8 text-sm" />
                              <Button size="sm" className="h-8 bg-primary text-primary-foreground" disabled={!inlineInput.nombre.trim()} onClick={async () => {
                                try { const t = await productTypesApi.create({ nombre: inlineInput.nombre.trim() }); setTipos((prev) => [...prev, t]); setProductForm((f) => ({ ...f, tipo_producto_id: t.id })); setInlineCreating(null) } catch (err: any) { setProductError(err.message) }
                              }}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => setInlineCreating(null)}><XIcon className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Garantia</label>
                          <div className="flex gap-2">
                            <select
                              value={productForm.garantia_id}
                              onChange={(e) => setProductForm((f) => ({ ...f, garantia_id: e.target.value }))}
                              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Sin garantia</option>
                              {garantias.map((g) => (<option key={g.id} value={g.id}>{g.nombre} ({g.dias} dias)</option>))}
                            </select>
                            <Button type="button" variant="outline" size="sm" className="bg-transparent h-9 w-9 p-0 flex-shrink-0" onClick={() => { setInlineCreating("garantia"); setInlineInput({ nombre: "", dias: "", porcentaje: "" }) }}><Plus className="h-4 w-4" /></Button>
                          </div>
                          {inlineCreating === "garantia" && (
                            <div className="flex gap-2 items-center p-2 bg-secondary/30 rounded-md border border-border">
                              <Input placeholder="Nombre..." value={inlineInput.nombre} onChange={(e) => setInlineInput((v) => ({ ...v, nombre: e.target.value }))} className="bg-background border-border h-8 text-sm flex-1" />
                              <Input type="number" min="1" placeholder="Dias" value={inlineInput.dias} onChange={(e) => setInlineInput((v) => ({ ...v, dias: e.target.value }))} className="bg-background border-border h-8 text-sm w-20" />
                              <Button size="sm" className="h-8 bg-primary text-primary-foreground" disabled={!inlineInput.nombre.trim() || !inlineInput.dias} onClick={async () => {
                                try { const g = await warrantyApi.create({ nombre: inlineInput.nombre.trim(), dias: parseInt(inlineInput.dias) }); setGarantias((prev) => [...prev, g]); setProductForm((f) => ({ ...f, garantia_id: g.id })); setInlineCreating(null) } catch (err: any) { setProductError(err.message) }
                              }}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => setInlineCreating(null)}><XIcon className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Empaque</label>
                          <div className="flex gap-2">
                            <select
                              value={productForm.empaque_id}
                              onChange={(e) => setProductForm((f) => ({ ...f, empaque_id: e.target.value }))}
                              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Sin empaque especial</option>
                              {empaques.map((e) => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
                            </select>
                            <Button type="button" variant="outline" size="sm" className="bg-transparent h-9 w-9 p-0 flex-shrink-0" onClick={() => { setInlineCreating("empaque"); setInlineInput({ nombre: "", dias: "", porcentaje: "" }) }}><Plus className="h-4 w-4" /></Button>
                          </div>
                          {inlineCreating === "empaque" && (
                            <div className="flex gap-2 items-center p-2 bg-secondary/30 rounded-md border border-border">
                              <Input placeholder="Nombre del empaque..." value={inlineInput.nombre} onChange={(e) => setInlineInput((v) => ({ ...v, nombre: e.target.value }))} className="bg-background border-border h-8 text-sm" />
                              <Button size="sm" className="h-8 bg-primary text-primary-foreground" disabled={!inlineInput.nombre.trim()} onClick={async () => {
                                try { const e = await packagingApi.create({ nombre: inlineInput.nombre.trim() }); setEmpaques((prev) => [...prev, e]); setProductForm((f) => ({ ...f, empaque_id: e.id })); setInlineCreating(null) } catch (err: any) { setProductError(err.message) }
                              }}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => setInlineCreating(null)}><XIcon className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Descuento</label>
                          <div className="flex gap-2">
                            <select
                              value={productForm.descuento_id}
                              onChange={(e) => setProductForm((f) => ({ ...f, descuento_id: e.target.value }))}
                              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Sin descuento</option>
                              {descuentos.map((d) => (<option key={d.id} value={d.id}>{d.nombre} ({d.porcentaje}%)</option>))}
                            </select>
                            <Button type="button" variant="outline" size="sm" className="bg-transparent h-9 w-9 p-0 flex-shrink-0" onClick={() => { setInlineCreating("descuento"); setInlineInput({ nombre: "", dias: "", porcentaje: "" }) }}><Plus className="h-4 w-4" /></Button>
                          </div>
                          {inlineCreating === "descuento" && (
                            <div className="flex gap-2 items-center p-2 bg-secondary/30 rounded-md border border-border">
                              <Input placeholder="Nombre..." value={inlineInput.nombre} onChange={(e) => setInlineInput((v) => ({ ...v, nombre: e.target.value }))} className="bg-background border-border h-8 text-sm flex-1" />
                              <Input type="number" min="1" max="100" placeholder="%" value={inlineInput.porcentaje} onChange={(e) => setInlineInput((v) => ({ ...v, porcentaje: e.target.value }))} className="bg-background border-border h-8 text-sm w-20" />
                              <Button size="sm" className="h-8 bg-primary text-primary-foreground" disabled={!inlineInput.nombre.trim() || !inlineInput.porcentaje} onClick={async () => {
                                try { const d = await discountsApi.create({ nombre: inlineInput.nombre.trim(), porcentaje: parseFloat(inlineInput.porcentaje) }); setDescuentos((prev) => [...prev, d]); setProductForm((f) => ({ ...f, descuento_id: d.id })); setInlineCreating(null) } catch (err: any) { setProductError(err.message) }
                              }}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => setInlineCreating(null)}><XIcon className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Umbral Envio Gratis (USD)
                            <span className="text-xs text-muted-foreground ml-1">(vacio = sin envio gratis, 0 = siempre gratis)</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.envio_gratis_umbral}
                            onChange={(e) => setProductForm((f) => ({ ...f, envio_gratis_umbral: e.target.value }))}
                            placeholder="100.00"
                            className="bg-background border-border"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => { setShowProductForm(false); resetProductForm() }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={handleSaveProduct}
                          disabled={productSaving}
                        >
                          {productSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          {editingProduct ? "Actualizar" : "Crear Producto"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Products Table */}
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Producto</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">SKU</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Precio</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Disponibilidad</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Max/Pedido</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredProducts.map((product) => {
                            const dispStatus = getDisponibilidadStatus(product.disponibilidad)
                            return (
                              <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                      <Image
                                        src={product.imagen_url || "/placeholder.svg"}
                                        alt={product.nombre}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">{product.nombre}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-muted-foreground">{product.sku}</td>
                                <td className="px-5 py-4 text-sm font-medium text-foreground">${Number(product.precio).toFixed(2)}</td>
                                <td className="px-5 py-4 text-sm text-foreground">{product.disponibilidad}</td>
                                <td className="px-5 py-4">
                                  <span className="text-sm font-medium text-foreground bg-secondary/60 px-2 py-0.5 rounded">
                                    {product.max_por_pedido}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${dispStatus.class}`}>
                                    {dispStatus.label}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-transparent"
                                      onClick={() => openEditProduct(product)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 bg-transparent"
                                      onClick={() => handleDeleteProduct(product.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {filteredProducts.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                {productSearchQuery
                                  ? "No se encontraron productos con esa busqueda."
                                  : "No hay productos registrados. Haz clic en \"Agregar\" para crear uno."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Customers Section */}
              {activeSection === "clientes" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="font-serif text-xl text-foreground">Gestion de Clientes</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>

                  {customerError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">{customerError}</div>
                  )}

                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* User Table */}
                    <div className={`${selectedCustomer ? "lg:col-span-2" : "lg:col-span-3"} bg-card rounded-lg border border-border overflow-hidden`}>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-secondary/50">
                            <tr>
                              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Cliente</th>
                              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Rol</th>
                              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Registro</th>
                              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredCustomers.map((customer) => {
                              const locked = isDefaultAdmin(customer.email)
                              return (
                              <tr
                                key={customer.id}
                                className={`hover:bg-secondary/30 transition-colors cursor-pointer ${selectedCustomer?.id === customer.id ? "bg-secondary/40" : ""}`}
                                onClick={() => setSelectedCustomer(customer)}
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{customer.nombre}</p>
                                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                                    </div>
                                    {locked && <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" title="Administrador por defecto" />}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    {locked ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
                                        <Lock className="h-3 w-3" /> admin
                                      </span>
                                    ) : (
                                    <select
                                      value={customer.rol}
                                      onChange={(e) => handleRoleChange(customer.id, e.target.value)}
                                      disabled={roleUpdating === customer.id}
                                      className={`appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-full border-0 focus:ring-2 focus:ring-primary cursor-pointer ${
                                        customer.rol === "admin"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-gray-100 text-gray-700"
                                      } ${roleUpdating === customer.id ? "opacity-50" : ""}`}
                                    >
                                      <option value="cliente">cliente</option>
                                      <option value="admin">admin</option>
                                    </select>
                                    )}
                                    {!locked && <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(customer.created_at)}</td>
                                <td className="px-5 py-4">
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-transparent"
                                      onClick={() => setSelectedCustomer(customer)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {!locked && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 bg-transparent"
                                      onClick={() => handleDeleteUser(customer.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              )
                            })}
                            {filteredCustomers.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                  {customerSearch ? "No se encontraron clientes con esa busqueda." : "No hay clientes registrados."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* User Detail Sidebar */}
                    {selectedCustomer && (
                      <div className="lg:col-span-1 bg-card rounded-lg border border-border p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-foreground">Detalle del Usuario</h3>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(null)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-col items-center mb-6">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <span className="text-primary font-bold text-2xl">
                              {selectedCustomer.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="font-medium text-foreground text-center">{selectedCustomer.nombre}</p>
                          <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                          <span className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            selectedCustomer.rol === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {selectedCustomer.rol === "admin" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                            {selectedCustomer.rol}
                          </span>
                          {isDefaultAdmin(selectedCustomer.email) && (
                            <span className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <Lock className="h-3 w-3" /> Administrador por defecto
                            </span>
                          )}
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">ID</span>
                            <span className="text-foreground font-mono text-xs">{selectedCustomer.id.slice(0, 12)}...</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Registro</span>
                            <span className="text-foreground">{formatDate(selectedCustomer.created_at)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Rol</span>
                            <span className="text-foreground capitalize">{selectedCustomer.rol}</span>
                          </div>
                          {selectedCustomer.telefono && (
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Telefono</span>
                            <span className="text-foreground">{selectedCustomer.telefono}</span>
                          </div>
                          )}
                        </div>

                        {!isDefaultAdmin(selectedCustomer.email) && (
                        <div className="mt-6 space-y-2">
                          <label htmlFor="roleSelect" className="text-sm font-medium text-foreground">Cambiar Rol</label>
                          <div className="flex gap-2">
                            <select
                              id="roleSelect"
                              value={selectedCustomer.rol}
                              onChange={(e) => handleRoleChange(selectedCustomer.id, e.target.value)}
                              disabled={roleUpdating === selectedCustomer.id}
                              className="flex-1 appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="cliente">Cliente</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>
                        )}

                        {!isDefaultAdmin(selectedCustomer.email) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 text-destructive hover:bg-destructive/10 bg-transparent"
                          onClick={() => handleDeleteUser(selectedCustomer.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Usuario
                        </Button>
                        ) : (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 text-center">
                          <Lock className="h-4 w-4 mx-auto mb-1" />
                          Este usuario no puede ser modificado ni eliminado
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Catalogo Section (Lookup Tables Management) */}
              {activeSection === "catalogo" && (
                <div className="space-y-6">
                  <h2 className="font-serif text-xl text-foreground">Gestion de Catalogo</h2>
                  <p className="text-sm text-muted-foreground">
                    Administra los tipos de producto, garantias, empaques y descuentos disponibles para asignar a los productos.
                  </p>

                  {catalogError && (
                    <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {catalogError}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Tipos de Producto */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <h3 className="font-medium text-foreground mb-4">Tipos de Producto</h3>
                      <div className="flex gap-2 mb-4">
                        <Input
                          placeholder="Nuevo tipo..."
                          value={catalogInput.nombre}
                          onChange={(e) => setCatalogInput((c) => ({ ...c, nombre: e.target.value }))}
                          className="bg-background border-border"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && catalogInput.nombre.trim()) {
                              try { const t = await productTypesApi.create({ nombre: catalogInput.nombre.trim() }); setTipos((prev) => [...prev, t]); setCatalogInput((c) => ({ ...c, nombre: "" })); setCatalogError(null) } catch (err: any) { setCatalogError(err.message) }
                            }
                          }}
                        />
                        <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
                          if (!catalogInput.nombre.trim()) return
                          try { const t = await productTypesApi.create({ nombre: catalogInput.nombre.trim() }); setTipos((prev) => [...prev, t]); setCatalogInput((c) => ({ ...c, nombre: "" })); setCatalogError(null) } catch (err: any) { setCatalogError(err.message) }
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {tipos.map((t) => (
                          <div key={t.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-2 text-sm">
                            <span>{t.nombre}</span>
                            <button type="button" onClick={async () => { await productTypesApi.delete(t.id); setTipos((prev) => prev.filter((x) => x.id !== t.id)) }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                        {tipos.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No hay tipos creados.</p>}
                      </div>
                    </div>

                    {/* Garantias */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <h3 className="font-medium text-foreground mb-4">Garantias</h3>
                      <div className="flex gap-2 mb-4">
                        <Input placeholder="Nombre..." value={catalogInput.nombre} onChange={(e) => setCatalogInput((c) => ({ ...c, nombre: e.target.value }))} className="bg-background border-border flex-1" />
                        <Input type="number" min="1" placeholder="Dias" value={catalogInput.dias} onChange={(e) => setCatalogInput((c) => ({ ...c, dias: e.target.value }))} className="bg-background border-border w-20" />
                        <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
                          if (!catalogInput.nombre.trim() || !catalogInput.dias) return
                          try { const g = await warrantyApi.create({ nombre: catalogInput.nombre.trim(), dias: parseInt(catalogInput.dias) }); setGarantias((prev) => [...prev, g]); setCatalogInput((c) => ({ ...c, nombre: "", dias: "" })); setCatalogError(null) } catch (err: any) { setCatalogError(err.message) }
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {garantias.map((g) => (
                          <div key={g.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-2 text-sm">
                            <span>{g.nombre} <span className="text-muted-foreground">({g.dias} dias)</span></span>
                            <button type="button" onClick={async () => { await warrantyApi.delete(g.id); setGarantias((prev) => prev.filter((x) => x.id !== g.id)) }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                        {garantias.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No hay garantias creadas.</p>}
                      </div>
                    </div>

                    {/* Empaques */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <h3 className="font-medium text-foreground mb-4">Empaques</h3>
                      <div className="flex gap-2 mb-4">
                        <Input placeholder="Nuevo empaque..." value={catalogInput.nombre} onChange={(e) => setCatalogInput((c) => ({ ...c, nombre: e.target.value }))} className="bg-background border-border" />
                        <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
                          if (!catalogInput.nombre.trim()) return
                          try { const e = await packagingApi.create({ nombre: catalogInput.nombre.trim() }); setEmpaques((prev) => [...prev, e]); setCatalogInput((c) => ({ ...c, nombre: "" })); setCatalogError(null) } catch (err: any) { setCatalogError(err.message) }
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {empaques.map((e) => (
                          <div key={e.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-2 text-sm">
                            <span>{e.nombre}</span>
                            <button type="button" onClick={async () => { await packagingApi.delete(e.id); setEmpaques((prev) => prev.filter((x) => x.id !== e.id)) }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                        {empaques.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No hay empaques creados.</p>}
                      </div>
                    </div>

                    {/* Descuentos */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <h3 className="font-medium text-foreground mb-4">Descuentos</h3>
                      <div className="flex gap-2 mb-4">
                        <Input placeholder="Nombre..." value={catalogInput.nombre} onChange={(e) => setCatalogInput((c) => ({ ...c, nombre: e.target.value }))} className="bg-background border-border flex-1" />
                        <Input type="number" min="1" max="100" placeholder="%" value={catalogInput.porcentaje} onChange={(e) => setCatalogInput((c) => ({ ...c, porcentaje: e.target.value }))} className="bg-background border-border w-20" />
                        <Button size="sm" className="bg-primary text-primary-foreground" onClick={async () => {
                          if (!catalogInput.nombre.trim() || !catalogInput.porcentaje) return
                          try { const d = await discountsApi.create({ nombre: catalogInput.nombre.trim(), porcentaje: parseFloat(catalogInput.porcentaje) }); setDescuentos((prev) => [...prev, d]); setCatalogInput((c) => ({ ...c, nombre: "", porcentaje: "" })); setCatalogError(null) } catch (err: any) { setCatalogError(err.message) }
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {descuentos.map((d) => (
                          <div key={d.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-2 text-sm">
                            <span>{d.nombre} <span className="text-primary font-medium">-{d.porcentaje}%</span></span>
                            <button type="button" onClick={async () => { await discountsApi.delete(d.id); setDescuentos((prev) => prev.filter((x) => x.id !== d.id)) }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                        {descuentos.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No hay descuentos creados.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Section */}
              {activeSection === "estadisticas" && (
                <div className="space-y-6">
                  <h2 className="font-serif text-xl text-foreground">Estadisticas y Reportes</h2>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Sales Chart Placeholder */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-foreground">Resumen de Pedidos</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Datos actuales
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-secondary/30 rounded-lg">
                          <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                          <p className="text-xs text-muted-foreground">Total Pedidos</p>
                        </div>
                        <div className="text-center p-4 bg-secondary/30 rounded-lg">
                          <p className="text-2xl font-bold text-foreground">{pendingOrders}</p>
                          <p className="text-xs text-muted-foreground">Pendientes</p>
                        </div>
                        <div className="text-center p-4 bg-secondary/30 rounded-lg">
                          <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Ingresos</p>
                        </div>
                        <div className="text-center p-4 bg-secondary/30 rounded-lg">
                          <p className="text-2xl font-bold text-foreground">
                            ${orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : "0.00"}
                          </p>
                          <p className="text-xs text-muted-foreground">Ticket Promedio</p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Overview */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <h3 className="font-medium text-foreground mb-4">Estado del Inventario</h3>
                      <div className="space-y-4">
                        {[
                          {
                            name: "Disponible",
                            value: products.filter((p) => p.disponibilidad >= 5).length,
                            total: products.length,
                            color: "bg-green-500",
                          },
                          {
                            name: "Baja Disponibilidad",
                            value: products.filter((p) => p.disponibilidad > 0 && p.disponibilidad < 5).length,
                            total: products.length,
                            color: "bg-yellow-500",
                          },
                          {
                            name: "No Disponible",
                            value: products.filter((p) => p.disponibilidad === 0).length,
                            total: products.length,
                            color: "bg-red-500",
                          },
                        ].map((cat) => (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-foreground">{cat.name}</span>
                              <span className="text-muted-foreground">
                                {cat.value} producto{cat.value !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full ${cat.color} rounded-full`}
                                style={{
                                  width: `${cat.total > 0 ? (cat.value / cat.total) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-card rounded-lg border border-border p-5">
                    <h3 className="font-medium text-foreground mb-4">Productos Destacados</h3>
                    <div className="space-y-3">
                      {products.slice(0, 5).map((product, index) => (
                        <div key={product.id} className="flex items-center gap-4">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {index + 1}
                          </span>
                          <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={product.imagen_url || "/placeholder.svg"}
                              alt={product.nombre}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.nombre}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <p className="text-sm font-medium text-foreground">${Number(product.precio).toFixed(2)}</p>
                        </div>
                      ))}
                      {products.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay productos registrados.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Section */}
              {activeSection === "ajustes" && (
                <div className="space-y-6">
                  <h2 className="font-serif text-xl text-foreground">Ajustes de la Tienda</h2>

                  {storeError && (
                    <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {storeError}
                    </div>
                  )}
                  {storeSuccess && (
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-700 text-sm rounded-md px-4 py-3">
                      <Check className="h-4 w-4 flex-shrink-0" />
                      Cambios guardados correctamente
                    </div>
                  )}

                  {/* Logo Upload */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Logo de la Empresa
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sube un logo en PNG, SVG, JPG o WebP. Se actualizara en toda la pagina.
                    </p>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setLogoUploading(true)
                        setStoreError(null)
                        try {
                          const reader = new FileReader()
                          reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
                          reader.readAsDataURL(file)
                          await storeConfigApi.uploadLogo(file)
                          await refreshStoreConfig()
                        } catch (err: unknown) {
                          setStoreError(err instanceof Error ? err.message : "Error al subir logo")
                        } finally {
                          setLogoUploading(false)
                          if (logoInputRef.current) logoInputRef.current.value = ""
                        }
                      }}
                    />

                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-secondary/30">
                        {logoPreview ? (
                          <Image src={logoPreview} alt="Logo" width={96} height={96} className="object-contain w-full h-full" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="bg-transparent" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                          {logoUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Subiendo...</> : "Cambiar Logo"}
                        </Button>
                        <p className="text-xs text-muted-foreground">Si no hay logo, se usa el por defecto.</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Informacion de Contacto
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email de Contacto</label>
                        <Input
                          type="email"
                          value={storeForm.email_contacto}
                          onChange={(e) => setStoreForm((f) => ({ ...f, email_contacto: e.target.value }))}
                          placeholder="contacto@monamourstudio.com"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email de Soporte</label>
                        <Input
                          type="email"
                          value={storeForm.email_soporte}
                          onChange={(e) => setStoreForm((f) => ({ ...f, email_soporte: e.target.value }))}
                          placeholder="soporte@monamourstudio.com"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Telefono de Contacto</label>
                        <Input
                          value={storeForm.telefono_contacto}
                          onChange={(e) => setStoreForm((f) => ({ ...f, telefono_contacto: e.target.value }))}
                          placeholder="+593 2 123 4567"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Telefono de Soporte</label>
                        <Input
                          value={storeForm.telefono_soporte}
                          onChange={(e) => setStoreForm((f) => ({ ...f, telefono_soporte: e.target.value }))}
                          placeholder="+593 9 987 6543"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Config */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Configuracion de Envio
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Envio Gratis desde (USD)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={storeForm.envio_gratis_desde}
                          onChange={(e) => setStoreForm((f) => ({ ...f, envio_gratis_desde: e.target.value }))}
                          placeholder="100.00"
                          className="bg-background border-border"
                        />
                        <p className="text-xs text-muted-foreground">0 = siempre gratis, vacio = sin envio gratis</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Costo de Envio Estandar (USD)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={storeForm.costo_envio}
                          onChange={(e) => setStoreForm((f) => ({ ...f, costo_envio: e.target.value }))}
                          placeholder="5.99"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Redes Sociales
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Instagram className="h-4 w-4" /> Instagram
                        </label>
                        <Input
                          value={storeForm.instagram_url}
                          onChange={(e) => setStoreForm((f) => ({ ...f, instagram_url: e.target.value }))}
                          placeholder="https://instagram.com/monamourstudio"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Globe className="h-4 w-4" /> TikTok
                        </label>
                        <Input
                          value={storeForm.tiktok_url}
                          onChange={(e) => setStoreForm((f) => ({ ...f, tiktok_url: e.target.value }))}
                          placeholder="https://tiktok.com/@monamourstudio"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" /> WhatsApp (Canal de Difusion)
                        </label>
                        <Input
                          value={storeForm.whatsapp_url}
                          onChange={(e) => setStoreForm((f) => ({ ...f, whatsapp_url: e.target.value }))}
                          placeholder="https://wa.me/channel/..."
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color Configuration */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Colores de la Pagina
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecciona los colores primario y de acento. Se generaran automaticamente los temas claro y oscuro.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">Color Primario</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={storeColorForm.primaryColor}
                            onChange={(e) => setStoreColorForm((f) => ({ ...f, primaryColor: e.target.value }))}
                            className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                          />
                          <div>
                            <p className="text-sm font-mono text-foreground">{storeColorForm.primaryColor}</p>
                            <p className="text-xs text-muted-foreground">Botones, enlaces, acentos principales</p>
                          </div>
                        </div>
                        <div className="h-8 rounded-lg" style={{ backgroundColor: storeColorForm.primaryColor }} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">Color de Acento</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={storeColorForm.accentColor}
                            onChange={(e) => setStoreColorForm((f) => ({ ...f, accentColor: e.target.value }))}
                            className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                          />
                          <div>
                            <p className="text-sm font-mono text-foreground">{storeColorForm.accentColor}</p>
                            <p className="text-xs text-muted-foreground">Badges, indicadores, destacados</p>
                          </div>
                        </div>
                        <div className="h-8 rounded-lg" style={{ backgroundColor: storeColorForm.accentColor }} />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={storeSaving}
                      onClick={async () => {
                        setStoreError(null)
                        setStoreSuccess(false)
                        // Validate shipping fields as numbers
                        if (storeForm.envio_gratis_desde && isNaN(parseFloat(storeForm.envio_gratis_desde))) {
                          setStoreError("El valor de 'Envio Gratis desde' debe ser un numero valido.")
                          return
                        }
                        if (storeForm.costo_envio && isNaN(parseFloat(storeForm.costo_envio))) {
                          setStoreError("El valor de 'Costo de Envio' debe ser un numero valido.")
                          return
                        }

                        setStoreSaving(true)
                        try {
                          const primaryHsl = hexToHsl(storeColorForm.primaryColor)
                          const accentHsl = hexToHsl(storeColorForm.accentColor)

                          await storeConfigApi.update({
                            email_contacto: storeForm.email_contacto || null,
                            email_soporte: storeForm.email_soporte || null,
                            telefono_contacto: storeForm.telefono_contacto || null,
                            telefono_soporte: storeForm.telefono_soporte || null,
                            envio_gratis_desde: storeForm.envio_gratis_desde ? parseFloat(storeForm.envio_gratis_desde) : null,
                            costo_envio: storeForm.costo_envio ? parseFloat(storeForm.costo_envio) : null,
                            instagram_url: storeForm.instagram_url || null,
                            tiktok_url: storeForm.tiktok_url || null,
                            whatsapp_url: storeForm.whatsapp_url || null,
                            color_primary_h: primaryHsl.h,
                            color_primary_s: primaryHsl.s,
                            color_primary_l: primaryHsl.l,
                            color_accent_h: accentHsl.h,
                            color_accent_s: accentHsl.s,
                            color_accent_l: accentHsl.l,
                          })
                          await refreshStoreConfig()
                          setStoreSuccess(true)
                          setTimeout(() => setStoreSuccess(false), 3000)
                        } catch (err: unknown) {
                          setStoreError(err instanceof Error ? err.message : "Error al guardar ajustes")
                        } finally {
                          setStoreSaving(false)
                        }
                      }}
                    >
                      {storeSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
