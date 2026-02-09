"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Loader2,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ordersApi, deliveriesApi } from "@/lib/api"
import type { PedidoResponse, EntregaResponse } from "@/lib/types"

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Package }> = {
  pendiente: { label: "Pendiente", color: "text-orange-700", bgColor: "bg-orange-100", icon: Clock },
  confirmado: { label: "Confirmado", color: "text-cyan-700", bgColor: "bg-cyan-100", icon: CheckCircle },
  procesando: { label: "En Proceso", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Package },
  enviado: { label: "Enviado", color: "text-blue-700", bgColor: "bg-blue-100", icon: Truck },
  entregado: { label: "Entregado", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "text-red-700", bgColor: "bg-red-100", icon: X },
}

const defaultStatus = { label: "Desconocido", color: "text-gray-700", bgColor: "bg-gray-100", icon: Clock }

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<PedidoResponse[]>([])
  const [deliveries, setDeliveries] = useState<Record<string, EntregaResponse>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return
    setIsLoading(true)
    ordersApi
      .list()
      .then(async (data) => {
        setOrders(data)
        if (data.length > 0) setExpandedOrder(data[0].id)
        // Fetch deliveries for shipped/delivered orders
        const deliveryMap: Record<string, EntregaResponse> = {}
        for (const order of data) {
          if (["enviado", "entregado"].includes(order.estado)) {
            try {
              const d = await deliveriesApi.getByOrder(order.id)
              deliveryMap[order.id] = d
            } catch { /* delivery may not exist yet */ }
          }
        }
        setDeliveries(deliveryMap)
      })
      .catch((err) => setError(err.message ?? "Error al cargar pedidos"))
      .finally(() => setIsLoading(false))
  }, [isAuthenticated])

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "todos" || order.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusProgress = (status: string) => {
    switch (status) {
      case "pendiente": return 10
      case "confirmado": return 25
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

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Cargando pedidos...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="bg-transparent">Reintentar</Button>
        </div>
      ) : (
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
              {["todos", "pendiente", "confirmado", "procesando", "enviado", "entregado", "cancelado"].map((status) => (
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
                  {status === "todos" ? "Todos" : (statusConfig[status]?.label ?? status)}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.estado] ?? defaultStatus
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
                            {new Date(order.fecha_creacion).toLocaleDateString("es-EC")} - {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold text-foreground text-lg">${Number(order.total).toFixed(2)}</p>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {/* Progress Bar (for active orders) */}
                        {order.estado !== "cancelado" && order.estado !== "entregado" && (
                          <div className="p-4 sm:p-6 bg-secondary/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Progreso del Pedido</span>
                              {deliveries[order.id]?.fecha_programada && (
                                <span className="text-sm text-muted-foreground">
                                  Entrega estimada: {new Date(deliveries[order.id].fecha_programada!).toLocaleDateString("es-EC")}
                                </span>
                              )}
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${getStatusProgress(order.estado)}%` }}
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
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">Producto</p>
                                    <p className="text-xs text-muted-foreground">
                                      Cantidad: {item.cantidad} | ${Number(item.precio_unitario).toFixed(2)} c/u
                                    </p>
                                    <p className="text-sm font-medium text-foreground mt-1">
                                      ${(item.cantidad * Number(item.precio_unitario)).toFixed(2)}
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
                                <p>{order.direccion_entrega}</p>
                              </div>
                            </div>

                            {/* Order Totals */}
                            <div>
                              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Resumen
                              </h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Subtotal: ${Number(order.subtotal).toFixed(2)}</p>
                                <p>Envio: ${Number(order.shipping).toFixed(2)}</p>
                                <p className="text-foreground font-medium">Total: ${Number(order.total).toFixed(2)}</p>
                              </div>
                            </div>

                            {/* Tracking Number */}
                            {deliveries[order.id]?.guia && (
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-primary" />
                                  Numero de Rastreo
                                </h4>
                                <p className="text-sm font-mono bg-secondary/50 rounded px-3 py-2 inline-block">
                                  {deliveries[order.id].guia}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delivery Info */}
                        {deliveries[order.id] && (
                          <div className="p-4 sm:p-6 border-t border-border">
                            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                              <Truck className="h-4 w-4 text-primary" />
                              Informacion de Entrega
                            </h4>
                            <div className="text-sm space-y-2">
                              <p><span className="text-muted-foreground">Guia:</span> <span className="font-mono">{deliveries[order.id].guia}</span></p>
                              <p><span className="text-muted-foreground">Estado:</span> {deliveries[order.id].estado}</p>
                              <p><span className="text-muted-foreground">Direccion:</span> {deliveries[order.id].direccion}</p>
                              {deliveries[order.id].fecha_programada && (
                                <p><span className="text-muted-foreground">Fecha programada:</span> {new Date(deliveries[order.id].fecha_programada!).toLocaleDateString("es-EC")}</p>
                              )}
                              {deliveries[order.id].fecha_entrega && (
                                <p><span className="text-muted-foreground">Entregado:</span> {new Date(deliveries[order.id].fecha_entrega!).toLocaleDateString("es-EC")}</p>
                              )}
                              {deliveries[order.id].notas && (
                                <p><span className="text-muted-foreground">Notas:</span> {deliveries[order.id].notas}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="p-4 sm:p-6 border-t border-border bg-secondary/30 flex flex-wrap gap-3">
                          {order.estado === "entregado" && (
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
                          {(order.estado === "enviado" || order.estado === "procesando") && (
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
                          {order.estado === "cancelado" && (
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Realizar Nuevo Pedido
                            </Button>
                          )}
                          {order.items.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-transparent ml-auto"
                            asChild
                          >
                            <Link href={`/product/${order.items[0].producto_id}`}>
                              Ver Producto
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          )}
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
      )}

      <Footer />
    </main>
  )
}
