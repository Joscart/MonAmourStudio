"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { inventoryApi, ordersApi, usersApi } from "@/lib/api"
import type { ProductoResponse, PedidoResponse, UsuarioResponse } from "@/lib/types"
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
  Edit2,
  Trash2,
  ChevronDown,
  BarChart3,
  Calendar,
  Loader2,
  Shield,
  ShieldCheck,
  X as XIcon,
} from "lucide-react"

const menuItems = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
  { id: "productos", label: "Productos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "estadisticas", label: "Estadisticas", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

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
  const [isLoading, setIsLoading] = useState(true)

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
    ])
      .then(([prods, ords, custs]) => {
        setProducts(prods)
        setOrders(ords)
        setCustomers(custs)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [authLoading, isAuthenticated, router])

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

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Agotado", class: "bg-red-100 text-red-700" }
    if (stock < 10) return { label: "Stock Bajo", class: "bg-yellow-100 text-yellow-700" }
    return { label: "Disponible", class: "bg-green-100 text-green-700" }
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleUpdating(userId)
    try {
      const updated = await usersApi.updateRole(userId, newRole)
      setCustomers((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, rol: updated.rol } : c)),
      )
      if (selectedCustomer?.id === userId) {
        setSelectedCustomer((prev) => (prev ? { ...prev, rol: updated.rol } : prev))
      }
    } catch {
      // silently fail
    } finally {
      setRoleUpdating(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.")) return
    try {
      await usersApi.deleteUser(userId)
      setCustomers((prev) => prev.filter((c) => c.id !== userId))
      if (selectedCustomer?.id === userId) setSelectedCustomer(null)
    } catch {
      // silently fail
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
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-accent-foreground font-bold text-lg">
                      {user?.nombre?.charAt(0)?.toUpperCase() ?? "A"}
                    </span>
                  </div>
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
                              <td className="px-5 py-4 text-sm font-medium text-foreground">${order.total.toFixed(2)}</td>
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
                              <td className="px-5 py-4 text-sm font-medium text-foreground">${order.total.toFixed(2)}</td>
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
                          className="pl-10 bg-card border-border"
                        />
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Producto</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">SKU</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Precio</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Stock</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {products.map((product) => {
                            const stockStatus = getStockStatus(product.stock)
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
                                <td className="px-5 py-4 text-sm font-medium text-foreground">${product.precio.toFixed(2)}</td>
                                <td className="px-5 py-4 text-sm text-foreground">{product.stock}</td>
                                <td className="px-5 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stockStatus.class}`}>
                                    {stockStatus.label}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 bg-transparent">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {products.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                No hay productos registrados.
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
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>

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
                            {customers.map((customer) => (
                              <tr
                                key={customer.id}
                                className={`hover:bg-secondary/30 transition-colors cursor-pointer ${selectedCustomer?.id === customer.id ? "bg-secondary/40" : ""}`}
                                onClick={() => setSelectedCustomer(customer)}
                              >
                                <td className="px-5 py-4">
                                  <p className="text-sm font-medium text-foreground">{customer.nombre}</p>
                                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={customer.rol}
                                      onChange={(e) => handleRoleChange(customer.id, e.target.value)}
                                      disabled={roleUpdating === customer.id}
                                      className={`appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-full border-0 focus:ring-2 focus:ring-primary cursor-pointer ${
                                        customer.rol === "admin"
                                          ? "bg-purple-100 text-purple-700"
                                          : customer.rol === "vendedor"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-gray-100 text-gray-700"
                                      } ${roleUpdating === customer.id ? "opacity-50" : ""}`}
                                    >
                                      <option value="cliente">cliente</option>
                                      <option value="vendedor">vendedor</option>
                                      <option value="admin">admin</option>
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 bg-transparent"
                                      onClick={() => handleDeleteUser(customer.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {customers.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                  No hay clientes registrados.
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
                              : selectedCustomer.rol === "vendedor"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}>
                            {selectedCustomer.rol === "admin" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                            {selectedCustomer.rol}
                          </span>
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
                        </div>

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
                              <option value="vendedor">Vendedor</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 text-destructive hover:bg-destructive/10 bg-transparent"
                          onClick={() => handleDeleteUser(selectedCustomer.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Usuario
                        </Button>
                      </div>
                    )}
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
                            value: products.filter((p) => p.stock >= 10).length,
                            total: products.length,
                            color: "bg-green-500",
                          },
                          {
                            name: "Stock Bajo",
                            value: products.filter((p) => p.stock > 0 && p.stock < 10).length,
                            total: products.length,
                            color: "bg-yellow-500",
                          },
                          {
                            name: "Agotado",
                            value: products.filter((p) => p.stock === 0).length,
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
                          <p className="text-sm font-medium text-foreground">${product.precio.toFixed(2)}</p>
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
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="font-serif text-xl text-foreground mb-6">Ajustes de la Tienda</h2>
                  
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="storeName" className="text-sm font-medium text-foreground">Nombre de la Tienda</label>
                        <Input id="storeName" defaultValue="Mon Amour Studio" className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="storeEmail" className="text-sm font-medium text-foreground">Email de Contacto</label>
                        <Input id="storeEmail" type="email" defaultValue="info@monamourstudio.com" className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="storePhone" className="text-sm font-medium text-foreground">Telefono</label>
                        <Input id="storePhone" defaultValue="+593 2 123 4567" className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="storeCurrency" className="text-sm font-medium text-foreground">Moneda</label>
                        <Input id="storeCurrency" defaultValue="USD ($)" className="bg-background border-border" />
                      </div>
                    </div>

                    <div className="border-t border-border pt-6">
                      <h3 className="font-medium text-foreground mb-4">Configuracion de Envio</h3>
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="freeShipping" className="text-sm font-medium text-foreground">Envio Gratis desde</label>
                          <Input id="freeShipping" defaultValue="$100.00" className="bg-background border-border" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="shippingCost" className="text-sm font-medium text-foreground">Costo de Envio Estandar</label>
                          <Input id="shippingCost" defaultValue="$5.99" className="bg-background border-border" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Guardar Cambios
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
