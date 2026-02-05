"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "lucide-react"

const menuItems = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
  { id: "productos", label: "Productos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "estadisticas", label: "Estadisticas", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

const statsCards = [
  { label: "Ventas del Mes", value: "$12,450", change: "+12.5%", icon: DollarSign, trend: "up" },
  { label: "Pedidos Nuevos", value: "48", change: "+8.2%", icon: ShoppingCart, trend: "up" },
  { label: "Clientes Activos", value: "324", change: "+5.1%", icon: Users, trend: "up" },
  { label: "Visitas", value: "2,841", change: "-2.4%", icon: Eye, trend: "down" },
]

const recentOrders = [
  { id: "ORD-001", cliente: "Maria Garcia", fecha: "15 Ene 2026", total: 214.00, estado: "Pendiente", items: 2 },
  { id: "ORD-002", cliente: "Carlos Lopez", fecha: "15 Ene 2026", total: 145.00, estado: "En Proceso", items: 1 },
  { id: "ORD-003", cliente: "Ana Rodriguez", fecha: "14 Ene 2026", total: 320.00, estado: "Enviado", items: 3 },
  { id: "ORD-004", cliente: "Pedro Sanchez", fecha: "14 Ene 2026", total: 89.00, estado: "Entregado", items: 1 },
  { id: "ORD-005", cliente: "Sofia Martinez", fecha: "13 Ene 2026", total: 275.00, estado: "Entregado", items: 2 },
]

const allOrders = [
  { id: "ORD-001", cliente: "Maria Garcia", email: "maria@correo.com", fecha: "15 Ene 2026", total: 214.00, estado: "Pendiente", items: 2 },
  { id: "ORD-002", cliente: "Carlos Lopez", email: "carlos@correo.com", fecha: "15 Ene 2026", total: 145.00, estado: "En Proceso", items: 1 },
  { id: "ORD-003", cliente: "Ana Rodriguez", email: "ana@correo.com", fecha: "14 Ene 2026", total: 320.00, estado: "Enviado", items: 3 },
  { id: "ORD-004", cliente: "Pedro Sanchez", email: "pedro@correo.com", fecha: "14 Ene 2026", total: 89.00, estado: "Entregado", items: 1 },
  { id: "ORD-005", cliente: "Sofia Martinez", email: "sofia@correo.com", fecha: "13 Ene 2026", total: 275.00, estado: "Entregado", items: 2 },
  { id: "ORD-006", cliente: "Luis Herrera", email: "luis@correo.com", fecha: "12 Ene 2026", total: 165.00, estado: "Entregado", items: 1 },
]

const products = [
  { id: "1", name: "Marco Romance Dorado", price: 89.00, stock: 24, category: "Marcos Premium", image: "/images/frame-1.jpg", status: "activo" },
  { id: "2", name: "Marco Flotante Oro Rosa", price: 125.00, stock: 15, category: "Coleccion Bodas", image: "/images/frame-2.jpg", status: "activo" },
  { id: "3", name: "Marco Barroco Vintage", price: 145.00, stock: 8, category: "Coleccion Clasica", image: "/images/frame-3.jpg", status: "activo" },
  { id: "4", name: "Marco Acrilico Moderno", price: 75.00, stock: 32, category: "Contemporaneo", image: "/images/frame-4.jpg", status: "activo" },
  { id: "5", name: "Marco Plata Grabado", price: 165.00, stock: 0, category: "Regalos Aniversario", image: "/images/frame-5.jpg", status: "agotado" },
  { id: "6", name: "Marco Vidrio Doble Cara", price: 110.00, stock: 18, category: "Marcos Premium", image: "/images/frame-6.jpg", status: "activo" },
]

const customers = [
  { id: "1", name: "Maria Garcia", email: "maria@correo.com", pedidos: 5, totalGastado: 845.00, fechaRegistro: "10 Nov 2025" },
  { id: "2", name: "Carlos Lopez", email: "carlos@correo.com", pedidos: 3, totalGastado: 420.00, fechaRegistro: "22 Dic 2025" },
  { id: "3", name: "Ana Rodriguez", email: "ana@correo.com", pedidos: 8, totalGastado: 1250.00, fechaRegistro: "5 Sep 2025" },
  { id: "4", name: "Pedro Sanchez", email: "pedro@correo.com", pedidos: 2, totalGastado: 234.00, fechaRegistro: "3 Ene 2026" },
  { id: "5", name: "Sofia Martinez", email: "sofia@correo.com", pedidos: 6, totalGastado: 980.00, fechaRegistro: "18 Oct 2025" },
]

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("resumen")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderFilter, setOrderFilter] = useState("todos")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregado":
        return "bg-green-100 text-green-700"
      case "Enviado":
        return "bg-blue-100 text-blue-700"
      case "En Proceso":
        return "bg-yellow-100 text-yellow-700"
      case "Pendiente":
        return "bg-orange-100 text-orange-700"
      case "Cancelado":
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

  const filteredOrders = orderFilter === "todos" 
    ? allOrders 
    : allOrders.filter(o => o.estado.toLowerCase() === orderFilter.toLowerCase())

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
              Bienvenido, Administrador. Gestiona tu tienda desde aqui.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-4 sticky top-24">
                {/* Admin Info */}
                <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-accent-foreground font-bold text-lg">A</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Admin</p>
                    <p className="text-xs text-muted-foreground">Super Administrador</p>
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
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            stat.trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {stat.change}
                          </span>
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
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Cliente</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Fecha</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Total</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {recentOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-5 py-4 text-sm font-medium text-foreground">{order.id}</td>
                              <td className="px-5 py-4 text-sm text-foreground">{order.cliente}</td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">{order.fecha}</td>
                              <td className="px-5 py-4 text-sm font-medium text-foreground">${order.total.toFixed(2)}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>
                                  {order.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
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
                          <option value="en proceso">En Proceso</option>
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
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Cliente</th>
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
                              <td className="px-5 py-4 text-sm font-medium text-foreground">{order.id}</td>
                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-foreground">{order.cliente}</p>
                                <p className="text-xs text-muted-foreground">{order.email}</p>
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">{order.fecha}</td>
                              <td className="px-5 py-4 text-sm text-foreground">{order.items}</td>
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
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Categoria</th>
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
                                        src={product.image || "/placeholder.svg"}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">{product.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-muted-foreground">{product.category}</td>
                                <td className="px-5 py-4 text-sm font-medium text-foreground">${product.price.toFixed(2)}</td>
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

                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Cliente</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Pedidos</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Total Gastado</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Registro</th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {customers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-foreground">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.email}</p>
                              </td>
                              <td className="px-5 py-4 text-sm text-foreground">{customer.pedidos}</td>
                              <td className="px-5 py-4 text-sm font-medium text-foreground">${customer.totalGastado.toFixed(2)}</td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">{customer.fechaRegistro}</td>
                              <td className="px-5 py-4">
                                <Button variant="outline" size="sm" className="bg-transparent">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Perfil
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                        <h3 className="font-medium text-foreground">Ventas Mensuales</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Ultimos 6 meses
                        </div>
                      </div>
                      <div className="h-48 flex items-end justify-between gap-2 pt-4">
                        {[65, 45, 78, 90, 82, 95].map((value, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className="w-full bg-primary/80 rounded-t"
                              style={{ height: `${value}%` }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {["Ago", "Sep", "Oct", "Nov", "Dic", "Ene"][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-card rounded-lg border border-border p-5">
                      <h3 className="font-medium text-foreground mb-4">Ventas por Categoria</h3>
                      <div className="space-y-4">
                        {[
                          { name: "Marcos Premium", value: 42, color: "bg-primary" },
                          { name: "Coleccion Bodas", value: 28, color: "bg-accent" },
                          { name: "Regalos Aniversario", value: 18, color: "bg-primary/60" },
                          { name: "Contemporaneo", value: 12, color: "bg-accent/60" },
                        ].map((cat) => (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-foreground">{cat.name}</span>
                              <span className="text-muted-foreground">{cat.value}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${cat.color} rounded-full`}
                                style={{ width: `${cat.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-card rounded-lg border border-border p-5">
                    <h3 className="font-medium text-foreground mb-4">Productos Mas Vendidos</h3>
                    <div className="space-y-3">
                      {products.slice(0, 5).map((product, index) => (
                        <div key={product.id} className="flex items-center gap-4">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {index + 1}
                          </span>
                          <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                          <p className="text-sm font-medium text-foreground">${product.price.toFixed(2)}</p>
                        </div>
                      ))}
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
