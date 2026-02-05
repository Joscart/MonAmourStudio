"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  ChevronDown,
  MapPin,
  Calendar,
  CreditCard,
  X,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
} from "lucide-react"

type OrderStatus = "pendiente" | "procesando" | "enviado" | "entregado" | "cancelado"

interface OrderItem {
  id: string
  name: string
  image: string
  quantity: number
  price: number
  size: string
}

interface Order {
  id: string
  date: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  shippingAddress: {
    name: string
    street: string
    city: string
    phone: string
  }
  paymentMethod: string
  trackingNumber?: string
  estimatedDelivery?: string
  timeline: {
    status: string
    date: string
    completed: boolean
  }[]
}

const orders: Order[] = [
  {
    id: "ORD-2026-001",
    date: "15 Enero 2026",
    status: "enviado",
    total: 234.00,
    items: [
      { id: "1", name: "Marco Romance Dorado", image: "/images/frame-1.jpg", quantity: 1, price: 109.00, size: "Mediano" },
      { id: "2", name: "Marco Flotante Oro Rosa", image: "/images/frame-2.jpg", quantity: 1, price: 125.00, size: "Grande" },
    ],
    shippingAddress: {
      name: "Maria Garcia",
      street: "Av. Amazonas N32-45",
      city: "Quito Norte",
      phone: "+593 99 123 4567",
    },
    paymentMethod: "Visa **** 4242",
    trackingNumber: "EC123456789QU",
    estimatedDelivery: "18-20 Enero 2026",
    timeline: [
      { status: "Pedido Recibido", date: "15 Ene, 10:30", completed: true },
      { status: "Pago Confirmado", date: "15 Ene, 10:32", completed: true },
      { status: "En Preparacion", date: "15 Ene, 14:00", completed: true },
      { status: "Enviado", date: "16 Ene, 09:15", completed: true },
      { status: "En Camino", date: "16 Ene, 11:00", completed: false },
      { status: "Entregado", date: "Pendiente", completed: false },
    ],
  },
  {
    id: "ORD-2026-002",
    date: "12 Enero 2026",
    status: "procesando",
    total: 145.00,
    items: [
      { id: "3", name: "Marco Barroco Vintage", image: "/images/frame-3.jpg", quantity: 1, price: 145.00, size: "Grande" },
    ],
    shippingAddress: {
      name: "Maria Garcia",
      street: "Av. Amazonas N32-45",
      city: "Quito Norte",
      phone: "+593 99 123 4567",
    },
    paymentMethod: "Visa **** 4242",
    estimatedDelivery: "17-19 Enero 2026",
    timeline: [
      { status: "Pedido Recibido", date: "12 Ene, 16:45", completed: true },
      { status: "Pago Confirmado", date: "12 Ene, 16:47", completed: true },
      { status: "En Preparacion", date: "13 Ene, 09:00", completed: false },
      { status: "Enviado", date: "Pendiente", completed: false },
      { status: "Entregado", date: "Pendiente", completed: false },
    ],
  },
  {
    id: "ORD-2025-089",
    date: "28 Diciembre 2025",
    status: "entregado",
    total: 89.00,
    items: [
      { id: "4", name: "Marco Acrilico Moderno", image: "/images/frame-4.jpg", quantity: 1, price: 89.00, size: "Pequeno" },
    ],
    shippingAddress: {
      name: "Maria Garcia",
      street: "Av. 6 de Diciembre N28-10",
      city: "Quito Centro",
      phone: "+593 99 123 4567",
    },
    paymentMethod: "Mastercard **** 5678",
    trackingNumber: "EC987654321QU",
    timeline: [
      { status: "Pedido Recibido", date: "28 Dic, 11:20", completed: true },
      { status: "Pago Confirmado", date: "28 Dic, 11:22", completed: true },
      { status: "En Preparacion", date: "28 Dic, 15:00", completed: true },
      { status: "Enviado", date: "29 Dic, 08:30", completed: true },
      { status: "Entregado", date: "31 Dic, 14:45", completed: true },
    ],
  },
  {
    id: "ORD-2025-075",
    date: "15 Diciembre 2025",
    status: "cancelado",
    total: 320.00,
    items: [
      { id: "5", name: "Marco Plata Grabado", image: "/images/frame-5.jpg", quantity: 2, price: 160.00, size: "Grande" },
    ],
    shippingAddress: {
      name: "Maria Garcia",
      street: "Av. Amazonas N32-45",
      city: "Quito Norte",
      phone: "+593 99 123 4567",
    },
    paymentMethod: "Visa **** 4242",
    timeline: [
      { status: "Pedido Recibido", date: "15 Dic, 09:00", completed: true },
      { status: "Cancelado por el usuario", date: "15 Dic, 10:30", completed: true },
    ],
  },
]

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: typeof Package }> = {
  pendiente: { label: "Pendiente", color: "text-orange-700", bgColor: "bg-orange-100", icon: Clock },
  procesando: { label: "En Proceso", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Package },
  enviado: { label: "Enviado", color: "text-blue-700", bgColor: "bg-blue-100", icon: Truck },
  entregado: { label: "Entregado", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "text-red-700", bgColor: "bg-red-100", icon: X },
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "todos">("todos")
  const [expandedOrder, setExpandedOrder] = useState<string | null>(orders[0].id)

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "todos" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusProgress = (status: OrderStatus) => {
    switch (status) {
      case "pendiente": return 10
      case "procesando": return 40
      case "enviado": return 70
      case "entregado": return 100
      case "cancelado": return 0
      default: return 0
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
              Mis Pedidos
            </h1>
            <p className="text-muted-foreground">
              Revisa el estado de tus pedidos y su historial de envio.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por numero de pedido o producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["todos", "procesando", "enviado", "entregado"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "todos" ? "Todos" : statusConfig[status].label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status]
                const isExpanded = expandedOrder === order.id
                const StatusIcon = status.icon

                return (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    {/* Order Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className={`w-12 h-12 rounded-full ${status.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <StatusIcon className={`h-6 w-6 ${status.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-medium text-foreground">{order.id}</p>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {order.date} - {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold text-foreground text-lg">${order.total.toFixed(2)}</p>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {/* Progress Bar (for active orders) */}
                        {order.status !== "cancelado" && order.status !== "entregado" && (
                          <div className="p-4 sm:p-6 bg-secondary/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Progreso del Pedido</span>
                              {order.estimatedDelivery && (
                                <span className="text-sm text-muted-foreground">
                                  Entrega estimada: {order.estimatedDelivery}
                                </span>
                              )}
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${getStatusProgress(order.status)}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                              <span>Recibido</span>
                              <span>Procesando</span>
                              <span>Enviado</span>
                              <span>Entregado</span>
                            </div>
                          </div>
                        )}

                        <div className="p-4 sm:p-6 grid md:grid-cols-2 gap-6">
                          {/* Order Items */}
                          <div>
                            <h4 className="font-medium text-foreground mb-4">Productos</h4>
                            <div className="space-y-3">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex gap-3">
                                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                                    <Image
                                      src={item.image || "/placeholder.svg"}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Tamano: {item.size} | Cantidad: {item.quantity}
                                    </p>
                                    <p className="text-sm font-medium text-foreground mt-1">
                                      ${item.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="space-y-4">
                            {/* Shipping Address */}
                            <div>
                              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Direccion de Envio
                              </h4>
                              <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                                <p className="text-foreground font-medium">{order.shippingAddress.name}</p>
                                <p>{order.shippingAddress.street}</p>
                                <p>{order.shippingAddress.city}</p>
                                <p>{order.shippingAddress.phone}</p>
                              </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Metodo de Pago
                              </h4>
                              <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                            </div>

                            {/* Tracking Number */}
                            {order.trackingNumber && (
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-primary" />
                                  Numero de Rastreo
                                </h4>
                                <p className="text-sm font-mono bg-secondary/50 rounded px-3 py-2 inline-block">
                                  {order.trackingNumber}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="p-4 sm:p-6 border-t border-border">
                          <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Historial del Pedido
                          </h4>
                          <div className="relative">
                            {order.timeline.map((event, index) => (
                              <div key={index} className="flex gap-4 pb-4 last:pb-0">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                    event.completed ? "bg-primary" : "bg-border"
                                  }`} />
                                  {index < order.timeline.length - 1 && (
                                    <div className={`w-0.5 flex-1 mt-1 ${
                                      event.completed ? "bg-primary" : "bg-border"
                                    }`} />
                                  )}
                                </div>
                                <div className="flex-1 pb-4">
                                  <p className={`text-sm font-medium ${event.completed ? "text-foreground" : "text-muted-foreground"}`}>
                                    {event.status}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{event.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 sm:p-6 border-t border-border bg-secondary/30 flex flex-wrap gap-3">
                          {order.status === "entregado" && (
                            <>
                              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Volver a Pedir
                              </Button>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                Escribir Resena
                              </Button>
                            </>
                          )}
                          {(order.status === "enviado" || order.status === "procesando") && (
                            <>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                <Truck className="h-4 w-4 mr-2" />
                                Rastrear Envio
                              </Button>
                              <Button size="sm" variant="outline" className="bg-transparent">
                                Contactar Soporte
                              </Button>
                            </>
                          )}
                          {order.status === "cancelado" && (
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Realizar Nuevo Pedido
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-transparent ml-auto"
                            asChild
                          >
                            <Link href={`/product/${order.items[0].id}`}>
                              Ver Producto
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border rounded-lg">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">No se encontraron pedidos</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "todos"
                  ? "No hay pedidos que coincidan con tu busqueda."
                  : "Aun no has realizado ningun pedido."
                }
              </p>
              {searchQuery || statusFilter !== "todos" ? (
                <Button
                  variant="outline"
                  onClick={() => { setSearchQuery(""); setStatusFilter("todos"); }}
                  className="bg-transparent"
                >
                  Limpiar Filtros
                </Button>
              ) : (
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/products">Explorar Productos</Link>
                </Button>
              )}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-12 bg-secondary/50 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Necesitas Ayuda?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Si tienes alguna pregunta sobre tus pedidos o necesitas asistencia, nuestro equipo esta aqui para ayudarte.
                </p>
                <div className="flex gap-3">
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Contactar Soporte
                  </Button>
                  <Button size="sm" variant="ghost" className="text-primary">
                    Ver Preguntas Frecuentes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
