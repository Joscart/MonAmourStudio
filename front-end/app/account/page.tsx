"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { ordersApi, usersApi, ApiError } from "@/lib/api"
import type { PedidoResponse } from "@/lib/types"
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
  const [isEditing, setIsEditing] = useState(false)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [orders, setOrders] = useState<PedidoResponse[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Sync form fields when user loads
  useEffect(() => {
    if (user) {
      setNombre(user.nombre)
      setEmail(user.email)
    }
  }, [user])

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeSection === "pedidos" && isAuthenticated) {
      setOrdersLoading(true)
      ordersApi.list()
        .then(setOrders)
        .catch(() => {})
        .finally(() => setOrdersLoading(false))
    }
  }, [activeSection, isAuthenticated])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await usersApi.updateMe({ nombre, email })
      await refreshUser()
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregado":
        return "bg-green-100 text-green-700"
      case "En camino":
        return "bg-blue-100 text-blue-700"
      case "Procesando":
        return "bg-yellow-100 text-yellow-700"
      default:
        return "bg-gray-100 text-gray-700"
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
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
              Mi Cuenta
            </h1>
            <p className="text-muted-foreground">
              Bienvenida, {user.nombre}. Administra tu cuenta y revisa tus pedidos.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-4 sticky top-24">
                {/* User Info */}
                <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {user.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
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
                    onClick={() => { logout(); router.push("/") }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors mt-4"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesion
                  </button>
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Profile Section */}
              {activeSection === "perfil" && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-xl text-foreground">Informacion Personal</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-transparent"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {isEditing ? "Cancelar" : "Editar"}
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        disabled={!isEditing}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electronico</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isEditing}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>

                  {saveError && (
                    <p className="mt-4 text-sm text-destructive">{saveError}</p>
                  )}

                  {isEditing && (
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : "Guardar Cambios"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Orders Section */}
              {activeSection === "pedidos" && (
                <div className="space-y-4">
                  <h2 className="font-serif text-xl text-foreground mb-4">Mis Pedidos</h2>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 bg-secondary rounded-lg">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aun no tienes pedidos.</p>
                      <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link href="/products">Explorar Productos</Link>
                      </Button>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-card rounded-lg border border-border p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <p className="font-medium text-foreground">Pedido #{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.fecha_creacion).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>
                              {order.estado}
                            </span>
                            <span className="font-medium text-foreground">${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">Producto #{item.producto_id}</p>
                                <p className="text-sm text-muted-foreground">Cantidad: {item.cantidad}</p>
                              </div>
                              <p className="text-sm font-medium text-foreground">${item.precio_unitario.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-4 bg-transparent">
                          <Link href="/orders">
                            Ver Detalles
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Favorites Section */}
              {activeSection === "favoritos" && (
                <div>
                  <h2 className="font-serif text-xl text-foreground mb-4">Mis Favoritos</h2>
                  <div className="text-center py-12 bg-secondary rounded-lg">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Los favoritos se guardan localmente en tu navegador.
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Aun no tienes productos favoritos.
                    </p>
                    <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href="/products">Explorar Productos</Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Addresses Section */}
              {activeSection === "direcciones" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl text-foreground">Mis Direcciones</h2>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Agregar Direccion
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg border border-border p-4 relative">
                      <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                        Principal
                      </span>
                      <MapPin className="h-5 w-5 text-primary mb-2" />
                      <p className="font-medium text-foreground">Casa</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Av. Amazonas N32-45 y Corea<br />
                        Quito, Pichincha 170150<br />
                        Ecuador
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="bg-transparent">Editar</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 bg-transparent">Eliminar</Button>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <MapPin className="h-5 w-5 text-primary mb-2" />
                      <p className="font-medium text-foreground">Oficina</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Av. 6 de Diciembre N28-10<br />
                        Quito, Pichincha 170150<br />
                        Ecuador
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="bg-transparent">Editar</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 bg-transparent">Eliminar</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Methods Section */}
              {activeSection === "pagos" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl text-foreground">Metodos de Pago</h2>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Agregar Tarjeta
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg border border-border p-4 relative">
                      <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                        Principal
                      </span>
                      <CreditCard className="h-5 w-5 text-primary mb-2" />
                      <p className="font-medium text-foreground">Visa terminada en 4242</p>
                      <p className="text-sm text-muted-foreground mt-1">Expira 12/2027</p>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="bg-transparent">Editar</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 bg-transparent">Eliminar</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Section */}
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

                    <div className="flex items-center justify-between py-4 border-b border-border">
                      <div>
                        <p className="font-medium text-foreground">Cambiar Contrasena</p>
                        <p className="text-sm text-muted-foreground">Actualiza tu contrasena de acceso</p>
                      </div>
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Cambiar
                      </Button>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-destructive">Eliminar Cuenta</p>
                        <p className="text-sm text-muted-foreground">Esta accion es irreversible</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 bg-transparent"
                        onClick={() => alert("Contacta a soporte para eliminar tu cuenta.")}
                      >
                        Eliminar
                      </Button>
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
