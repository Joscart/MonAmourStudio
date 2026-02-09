"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { ordersApi, usersApi, favoritesApi, inventoryApi, ApiError } from "@/lib/api"
import type { PedidoResponse, DireccionResponse, MetodoPagoResponse, ProductoResponse } from "@/lib/types"
import {
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  MapPin,
  CreditCard,
  ChevronRight,
  Edit2,
  Loader2,
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react"

const menuItems = [
  { id: "perfil", label: "Mi Perfil", icon: User },
  { id: "pedidos", label: "Mis Pedidos", icon: Package },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "direcciones", label: "Direcciones", icon: MapPin },
  { id: "pagos", label: "Metodos de Pago", icon: CreditCard },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

export default function AccountPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout, refreshUser } = useAuth()
  const [activeSection, setActiveSection] = useState("perfil")

  // Profile editing
  const [isEditing, setIsEditing] = useState(false)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Orders
  const [orders, setOrders] = useState<PedidoResponse[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Favorites
  const [favProducts, setFavProducts] = useState<ProductoResponse[]>([])
  const [favIds, setFavIds] = useState<string[]>([])
  const [favLoading, setFavLoading] = useState(false)

  // Addresses
  const [direcciones, setDirecciones] = useState<DireccionResponse[]>([])
  const [dirLoading, setDirLoading] = useState(false)
  const [showDirForm, setShowDirForm] = useState(false)
  const [dirForm, setDirForm] = useState({ etiqueta: "Casa", linea1: "", linea2: "", ciudad: "", provincia: "", codigo_postal: "", pais: "Ecuador", es_principal: false })

  // Payment methods
  const [metodos, setMetodos] = useState<MetodoPagoResponse[]>([])
  const [metLoading, setMetLoading] = useState(false)
  const [showMetForm, setShowMetForm] = useState(false)
  const [metForm, setMetForm] = useState({ tipo: "Visa", ultimos_4: "", titular: "", expiracion: "", es_principal: false })

  // Password change
  const [showPwChange, setShowPwChange] = useState(false)
  const [pwForm, setPwForm] = useState({ current: "", new1: "", new2: "" })
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  // General error
  const [sectionError, setSectionError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Sync profile form
  useEffect(() => {
    if (user) {
      setNombre(user.nombre)
      setEmail(user.email)
      setTelefono(user.telefono ?? "")
    }
  }, [user])

  // Load data for each section
  useEffect(() => {
    if (!isAuthenticated || !user) return
    setSectionError(null)
    if (activeSection === "pedidos") {
      setOrdersLoading(true)
      ordersApi.list().then(setOrders).catch(() => {}).finally(() => setOrdersLoading(false))
    } else if (activeSection === "favoritos") {
      setFavLoading(true)
      favoritesApi.listIds(user.id)
        .then(async (ids) => {
          setFavIds(ids)
          if (ids.length > 0) {
            const all = await inventoryApi.list({ limit: 200 })
            setFavProducts(all.filter((p) => ids.includes(p.id)))
          } else {
            setFavProducts([])
          }
        })
        .catch(() => {})
        .finally(() => setFavLoading(false))
    } else if (activeSection === "direcciones") {
      setDirLoading(true)
      usersApi.listDirecciones().then(setDirecciones).catch(() => {}).finally(() => setDirLoading(false))
    } else if (activeSection === "pagos") {
      setMetLoading(true)
      usersApi.listMetodosPago().then(setMetodos).catch(() => {}).finally(() => setMetLoading(false))
    }
  }, [activeSection, isAuthenticated, user])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await usersApi.updateMe({ nombre, email, telefono: telefono || undefined })
      await refreshUser()
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError(null)
    if (pwForm.new1 !== pwForm.new2) { setPwError("Las contraseñas no coinciden"); return }
    if (pwForm.new1.length < 6) { setPwError("La nueva contraseña debe tener al menos 6 caracteres"); return }
    setPwSaving(true)
    try {
      await usersApi.changePassword({ current_password: pwForm.current, new_password: pwForm.new1 })
      setShowPwChange(false)
      setPwForm({ current: "", new1: "", new2: "" })
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Error al cambiar contraseña")
    } finally {
      setPwSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await usersApi.deleteOwnAccount()
      logout()
      router.push("/")
    } catch (err) {
      setSectionError(err instanceof ApiError ? err.message : "Error al eliminar cuenta")
      setDeleting(false)
    }
  }

  const handleCreateDireccion = async () => {
    try {
      const d = await usersApi.createDireccion({
        etiqueta: dirForm.etiqueta,
        linea1: dirForm.linea1,
        linea2: dirForm.linea2 || undefined,
        ciudad: dirForm.ciudad,
        provincia: dirForm.provincia,
        codigo_postal: dirForm.codigo_postal,
        pais: dirForm.pais,
        es_principal: dirForm.es_principal,
      })
      setDirecciones((prev) => dirForm.es_principal ? [d, ...prev.map((x) => ({ ...x, es_principal: false }))] : [...prev, d])
      setShowDirForm(false)
      setDirForm({ etiqueta: "Casa", linea1: "", linea2: "", ciudad: "", provincia: "", codigo_postal: "", pais: "Ecuador", es_principal: false })
    } catch (err) {
      setSectionError(err instanceof ApiError ? err.message : "Error al crear dirección")
    }
  }

  const handleDeleteDireccion = async (id: string) => {
    try {
      await usersApi.deleteDireccion(id)
      setDirecciones((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setSectionError(err instanceof ApiError ? err.message : "Error al eliminar")
    }
  }

  const handleCreateMetodo = async () => {
    try {
      const m = await usersApi.createMetodoPago({
        tipo: metForm.tipo,
        ultimos_4: metForm.ultimos_4,
        titular: metForm.titular,
        expiracion: metForm.expiracion,
        es_principal: metForm.es_principal,
      })
      setMetodos((prev) => metForm.es_principal ? [m, ...prev.map((x) => ({ ...x, es_principal: false }))] : [...prev, m])
      setShowMetForm(false)
      setMetForm({ tipo: "Visa", ultimos_4: "", titular: "", expiracion: "", es_principal: false })
    } catch (err) {
      setSectionError(err instanceof ApiError ? err.message : "Error al crear método de pago")
    }
  }

  const handleDeleteMetodo = async (id: string) => {
    try {
      await usersApi.deleteMetodoPago(id)
      setMetodos((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setSectionError(err instanceof ApiError ? err.message : "Error al eliminar")
    }
  }

  const handleRemoveFavorite = async (productId: string) => {
    if (!user) return
    try {
      await favoritesApi.toggle(productId, user.id)
      setFavIds((prev) => prev.filter((id) => id !== productId))
      setFavProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch {}
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Entregado": return "bg-green-100 text-green-700"
      case "En camino": return "bg-blue-100 text-blue-700"
      case "Procesando": return "bg-yellow-100 text-yellow-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Mi Cuenta</h1>
            <p className="text-muted-foreground">Bienvenida, {user.nombre}. Administra tu cuenta y revisa tus pedidos.</p>
          </div>

          {sectionError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">{sectionError}</div>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-4 sticky top-24">
                <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.nombre}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${activeSection === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => { logout(); router.push("/") }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors mt-4">
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesion
                  </button>
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* ── PERFIL ──────────────────────────────────────────── */}
              {activeSection === "perfil" && (
                <>
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-serif text-xl text-foreground">Informacion Personal</h2>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="bg-transparent">
                        <Edit2 className="h-4 w-4 mr-2" />
                        {isEditing ? "Cancelar" : "Editar"}
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!isEditing} className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electronico</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefono">Telefono</Label>
                        <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={!isEditing} placeholder="Ej: +593 99 123 4567" className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Input value={user.rol} disabled className="bg-background border-border capitalize" />
                      </div>
                    </div>
                    {saveError && <p className="mt-4 text-sm text-destructive">{saveError}</p>}
                    {isEditing && (
                      <div className="mt-6 flex gap-3">
                        <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : "Guardar Cambios"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {user.rol === "admin" && (
                    <Link href="/dashboard" className="mt-4 flex items-center justify-between bg-card rounded-lg border border-border p-5 hover:border-primary/50 hover:bg-primary/5 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5 text-purple-700" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Administrar</p>
                          <p className="text-sm text-muted-foreground">Panel de administracion de la tienda</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  )}
                </>
              )}

              {/* ── PEDIDOS ─────────────────────────────────────────── */}
              {activeSection === "pedidos" && (
                <div className="space-y-4">
                  <h2 className="font-serif text-xl text-foreground mb-4">Mis Pedidos</h2>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 bg-secondary rounded-lg">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aun no tienes pedidos.</p>
                      <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"><Link href="/products">Explorar Productos</Link></Button>
                    </div>
                  ) : orders.map((order) => (
                    <div key={order.id} className="bg-card rounded-lg border border-border p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="font-medium text-foreground">Pedido #{order.id}</p>
                          <p className="text-sm text-muted-foreground">{new Date(order.fecha_creacion).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>{order.estado}</span>
                          <span className="font-medium text-foreground">${Number(order.total).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0"><Package className="h-5 w-5 text-muted-foreground" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">Producto #{item.producto_id}</p>
                              <p className="text-sm text-muted-foreground">Cantidad: {item.cantidad}</p>
                            </div>
                            <p className="text-sm font-medium text-foreground">${Number(item.precio_unitario).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── FAVORITOS ──────────────────────────────────────── */}
              {activeSection === "favoritos" && (
                <div>
                  <h2 className="font-serif text-xl text-foreground mb-4">Mis Favoritos</h2>
                  {favLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : favProducts.length === 0 ? (
                    <div className="text-center py-12 bg-secondary rounded-lg">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aun no tienes productos favoritos.</p>
                      <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"><Link href="/products">Explorar Productos</Link></Button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {favProducts.map((p) => (
                        <div key={p.id} className="bg-card rounded-lg border border-border overflow-hidden group">
                          <Link href={`/product/${p.id}`}>
                            <div className="relative aspect-square bg-secondary">
                              <Image src={p.imagen_url || "/placeholder.svg"} alt={p.nombre} fill className="object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          </Link>
                          <div className="p-4">
                            <Link href={`/product/${p.id}`}><h3 className="font-medium text-foreground hover:text-primary transition-colors">{p.nombre}</h3></Link>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-primary font-medium">${Number(p.precio).toFixed(2)}</p>
                              <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:bg-destructive/10" onClick={() => handleRemoveFavorite(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── DIRECCIONES ─────────────────────────────────────── */}
              {activeSection === "direcciones" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl text-foreground">Mis Direcciones</h2>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setShowDirForm(!showDirForm)}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar Direccion
                    </Button>
                  </div>

                  {showDirForm && (
                    <div className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Etiqueta</Label>
                          <Input value={dirForm.etiqueta} onChange={(e) => setDirForm((f) => ({ ...f, etiqueta: e.target.value }))} placeholder="Casa, Oficina..." className="bg-background border-border h-9" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pais</Label>
                          <Input value={dirForm.pais} onChange={(e) => setDirForm((f) => ({ ...f, pais: e.target.value }))} className="bg-background border-border h-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Linea 1 *</Label>
                        <Input value={dirForm.linea1} onChange={(e) => setDirForm((f) => ({ ...f, linea1: e.target.value }))} placeholder="Av. Amazonas N32-45..." className="bg-background border-border h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Linea 2</Label>
                        <Input value={dirForm.linea2} onChange={(e) => setDirForm((f) => ({ ...f, linea2: e.target.value }))} placeholder="Piso, depto..." className="bg-background border-border h-9" />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Ciudad *</Label>
                          <Input value={dirForm.ciudad} onChange={(e) => setDirForm((f) => ({ ...f, ciudad: e.target.value }))} className="bg-background border-border h-9" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Provincia *</Label>
                          <Input value={dirForm.provincia} onChange={(e) => setDirForm((f) => ({ ...f, provincia: e.target.value }))} className="bg-background border-border h-9" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Codigo Postal *</Label>
                          <Input value={dirForm.codigo_postal} onChange={(e) => setDirForm((f) => ({ ...f, codigo_postal: e.target.value }))} className="bg-background border-border h-9" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dirForm.es_principal} onChange={(e) => setDirForm((f) => ({ ...f, es_principal: e.target.checked }))} /> Marcar como principal</label>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-primary text-primary-foreground" disabled={!dirForm.linea1 || !dirForm.ciudad || !dirForm.provincia || !dirForm.codigo_postal} onClick={handleCreateDireccion}>Guardar</Button>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setShowDirForm(false)}>Cancelar</Button>
                      </div>
                    </div>
                  )}

                  {dirLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : direcciones.length === 0 ? (
                    <div className="text-center py-12 bg-secondary rounded-lg">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aun no tienes direcciones guardadas.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {direcciones.map((d) => (
                        <div key={d.id} className="bg-card rounded-lg border border-border p-4 relative">
                          {d.es_principal && <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">Principal</span>}
                          <MapPin className="h-5 w-5 text-primary mb-2" />
                          <p className="font-medium text-foreground">{d.etiqueta}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {d.linea1}{d.linea2 && <><br />{d.linea2}</>}<br />
                            {d.ciudad}, {d.provincia} {d.codigo_postal}<br />
                            {d.pais}
                          </p>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 bg-transparent" onClick={() => handleDeleteDireccion(d.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── METODOS DE PAGO ──────────────────────────────────── */}
              {activeSection === "pagos" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl text-foreground">Metodos de Pago</h2>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setShowMetForm(!showMetForm)}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar Tarjeta
                    </Button>
                  </div>

                  {showMetForm && (
                    <div className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo de Tarjeta</Label>
                          <select value={metForm.tipo} onChange={(e) => setMetForm((f) => ({ ...f, tipo: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm h-9">
                            <option>Visa</option><option>Mastercard</option><option>Amex</option><option>Diners</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Ultimos 4 digitos *</Label>
                          <Input maxLength={4} value={metForm.ultimos_4} onChange={(e) => setMetForm((f) => ({ ...f, ultimos_4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="4242" className="bg-background border-border h-9" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Titular *</Label>
                          <Input value={metForm.titular} onChange={(e) => setMetForm((f) => ({ ...f, titular: e.target.value }))} placeholder="Nombre en la tarjeta" className="bg-background border-border h-9" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Expiracion * (MM/YYYY)</Label>
                          <Input value={metForm.expiracion} onChange={(e) => setMetForm((f) => ({ ...f, expiracion: e.target.value }))} placeholder="12/2027" className="bg-background border-border h-9" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={metForm.es_principal} onChange={(e) => setMetForm((f) => ({ ...f, es_principal: e.target.checked }))} /> Marcar como principal</label>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-primary text-primary-foreground" disabled={metForm.ultimos_4.length !== 4 || !metForm.titular || !metForm.expiracion.match(/^\d{2}\/\d{4}$/)} onClick={handleCreateMetodo}>Guardar</Button>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setShowMetForm(false)}>Cancelar</Button>
                      </div>
                    </div>
                  )}

                  {metLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : metodos.length === 0 ? (
                    <div className="text-center py-12 bg-secondary rounded-lg">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aun no tienes metodos de pago guardados.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {metodos.map((m) => (
                        <div key={m.id} className="bg-card rounded-lg border border-border p-4 relative">
                          {m.es_principal && <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">Principal</span>}
                          <CreditCard className="h-5 w-5 text-primary mb-2" />
                          <p className="font-medium text-foreground">{m.tipo} terminada en {m.ultimos_4}</p>
                          <p className="text-sm text-muted-foreground mt-1">{m.titular} — Expira {m.expiracion}</p>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 bg-transparent" onClick={() => handleDeleteMetodo(m.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── AJUSTES ─────────────────────────────────────────── */}
              {activeSection === "ajustes" && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="font-serif text-xl text-foreground mb-6">Ajustes de Cuenta</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-border">
                      <div>
                        <p className="font-medium text-foreground">Notificaciones por Email</p>
                        <p className="text-sm text-muted-foreground">Recibe ofertas y novedades</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                      </label>
                    </div>

                    {/* Password Change */}
                    <div className="py-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Cambiar Contrasena</p>
                          <p className="text-sm text-muted-foreground">Actualiza tu contrasena de acceso</p>
                        </div>
                        <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setShowPwChange(!showPwChange)}>
                          {showPwChange ? "Cancelar" : "Cambiar"}
                        </Button>
                      </div>
                      {showPwChange && (
                        <div className="mt-4 space-y-3 max-w-md">
                          <div className="space-y-1">
                            <Label className="text-xs">Contrasena actual</Label>
                            <div className="relative">
                              <Input type={showCurrentPw ? "text" : "password"} value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} className="bg-background border-border h-9 pr-10" />
                              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nueva contrasena</Label>
                            <div className="relative">
                              <Input type={showNewPw ? "text" : "password"} value={pwForm.new1} onChange={(e) => setPwForm((f) => ({ ...f, new1: e.target.value }))} className="bg-background border-border h-9 pr-10" />
                              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Confirmar nueva contrasena</Label>
                            <Input type="password" value={pwForm.new2} onChange={(e) => setPwForm((f) => ({ ...f, new2: e.target.value }))} className="bg-background border-border h-9" />
                          </div>
                          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                          <Button size="sm" className="bg-primary text-primary-foreground" disabled={pwSaving || !pwForm.current || !pwForm.new1 || !pwForm.new2} onClick={handleChangePassword}>
                            {pwSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                            Cambiar Contrasena
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Delete Account */}
                    <div className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-destructive">Eliminar Cuenta</p>
                          <p className="text-sm text-muted-foreground">Esta accion es irreversible</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 bg-transparent" onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}>
                          Eliminar
                        </Button>
                      </div>
                      {showDeleteConfirm && (
                        <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3 max-w-md">
                          <p className="text-sm text-foreground">Escribe <strong>ELIMINAR</strong> para confirmar la eliminacion permanente de tu cuenta.</p>
                          <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Escribe ELIMINAR" className="bg-background border-border h-9" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" disabled={deleteConfirmText !== "ELIMINAR" || deleting} onClick={handleDeleteAccount}>
                              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                              Confirmar Eliminacion
                            </Button>
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText("") }}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                    </div>
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
