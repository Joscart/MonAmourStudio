"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MapPin,
  CreditCard,
  Check,
  ChevronRight,
  Lock,
  Truck,
  Package,
  Navigation,
  Search,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { ordersApi, ApiError } from "@/lib/api"

// Simulated locations for Ecuador
const deliveryZones = [
  { id: 1, name: "Quito Norte", lat: -0.1807, lng: -78.4678, available: true, deliveryDays: "1-2" },
  { id: 2, name: "Quito Centro", lat: -0.2201, lng: -78.5123, available: true, deliveryDays: "1-2" },
  { id: 3, name: "Quito Sur", lat: -0.2567, lng: -78.5249, available: true, deliveryDays: "2-3" },
  { id: 4, name: "Cumbaya", lat: -0.2050, lng: -78.4351, available: true, deliveryDays: "2-3" },
  { id: 5, name: "Valle de los Chillos", lat: -0.2987, lng: -78.4612, available: true, deliveryDays: "2-3" },
  { id: 6, name: "Guayaquil", lat: -2.1894, lng: -79.8891, available: true, deliveryDays: "3-5" },
  { id: 7, name: "Cuenca", lat: -2.9001, lng: -79.0059, available: true, deliveryDays: "4-6" },
]

export default function PaymentPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const shipping = subtotal >= 100 ? 0 : 5.99
  const total = subtotal + shipping

  const [currentStep, setCurrentStep] = useState<"direccion" | "pago" | "confirmacion">("direccion")
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: -0.1807, lng: -78.4678 })
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedZone, setSelectedZone] = useState<typeof deliveryZones[0] | null>(null)
  const [addressSearch, setAddressSearch] = useState("")
  const [showZoneWarning, setShowZoneWarning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  
  const [addressData, setAddressData] = useState({
    fullName: "",
    phone: "",
    street: "",
    reference: "",
    city: "",
    province: "",
  })

  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
  })

  const mapRef = useRef<HTMLDivElement>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (items.length === 0 && currentStep !== "confirmacion") {
      router.push("/cart")
    }
  }, [items, currentStep, router])

  // Simulated geocoding
  const searchAddress = () => {
    if (!addressSearch) return
    
    // Find closest zone based on search
    const searchLower = addressSearch.toLowerCase()
    const matchedZone = deliveryZones.find(zone => 
      zone.name.toLowerCase().includes(searchLower) ||
      searchLower.includes(zone.name.toLowerCase())
    )
    
    if (matchedZone) {
      setMapCenter({ lat: matchedZone.lat, lng: matchedZone.lng })
      setMarkerPosition({ lat: matchedZone.lat, lng: matchedZone.lng })
      setSelectedZone(matchedZone)
      setShowZoneWarning(false)
      setAddressData(prev => ({ ...prev, city: matchedZone.name, province: "Pichincha" }))
    } else {
      setShowZoneWarning(true)
      setSelectedZone(null)
    }
  }

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return
    
    const rect = mapRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Convert to approximate lat/lng (simplified for demo)
    const lat = -0.1 - (y / 100) * 0.3
    const lng = -78.3 - (x / 100) * 0.4
    
    setMarkerPosition({ lat, lng })
    
    // Find nearest zone
    let nearestZone = deliveryZones[0]
    let minDistance = Number.POSITIVE_INFINITY
    
    for (const zone of deliveryZones) {
      const distance = Math.sqrt(
        (zone.lat - lat) ** 2 + (zone.lng - lng) ** 2
      )
      if (distance < minDistance) {
        minDistance = distance
        nearestZone = zone
      }
    }
    
    if (minDistance < 0.1) {
      setSelectedZone(nearestZone)
      setShowZoneWarning(false)
      setAddressData(prev => ({ ...prev, city: nearestZone.name }))
    } else {
      setSelectedZone(null)
      setShowZoneWarning(true)
    }
  }

  const getCurrentLocation = () => {
    setIsLocating(true)
    
    // Simulate getting location
    setTimeout(() => {
      const randomZone = deliveryZones[Math.floor(Math.random() * 5)]
      setMapCenter({ lat: randomZone.lat, lng: randomZone.lng })
      setMarkerPosition({ lat: randomZone.lat, lng: randomZone.lng })
      setSelectedZone(randomZone)
      setShowZoneWarning(false)
      setAddressData(prev => ({ ...prev, city: randomZone.name, province: "Pichincha" }))
      setIsLocating(false)
    }, 1500)
  }

  const handleProcessPayment = async () => {
    setIsProcessing(true)
    setOrderError(null)
    try {
      const fullAddress = `${addressData.street}, ${addressData.city}${addressData.reference ? ` (${addressData.reference})` : ""}`
      const coords = markerPosition ? `${markerPosition.lat},${markerPosition.lng}` : undefined

      // 1. Create order
      const order = await ordersApi.create({
        items: items.map((item) => ({
          producto_id: item.id,
          variante: null,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        })),
        direccion_entrega: fullAddress,
        coordenadas_entrega: coords,
      })

      // 2. Process payment
      await ordersApi.pay(order.id, {
        monto: order.total,
        metodo_pago: `card_${paymentData.cardNumber.slice(-4)}`,
      })

      setCreatedOrderId(order.id)
      clearCart()
      setCurrentStep("confirmacion")
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : "Error al procesar el pago. Intenta de nuevo.")
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : value
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4)
    }
    return v
  }

  const steps = [
    { id: "direccion", label: "Direccion", icon: MapPin },
    { id: "pago", label: "Pago", icon: CreditCard },
    { id: "confirmacion", label: "Confirmacion", icon: Check },
  ]

  const canProceedToPayment = selectedZone && addressData.fullName && addressData.phone && addressData.street
  const canProceedToConfirm = paymentData.cardNumber.length >= 19 && paymentData.cardName && paymentData.expiry.length === 5 && paymentData.cvv.length >= 3

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/cart" className="hover:text-primary transition-colors">Carrito</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Finalizar Compra</span>
          </nav>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-12">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : steps.findIndex(s => s.id === currentStep) > index
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    steps.findIndex(s => s.id === currentStep) > index
                      ? "bg-primary"
                      : "bg-border"
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Address */}
              {currentStep === "direccion" && (
                <>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h2 className="font-serif text-xl text-foreground mb-6">Direccion de Entrega</h2>
                    
                    {/* Map Section */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-3 block">
                        Selecciona tu ubicacion en el mapa
                      </label>
                      
                      {/* Search Bar */}
                      <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar direccion o zona..."
                            value={addressSearch}
                            onChange={(e) => setAddressSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && searchAddress()}
                            className="pl-10 bg-background border-border"
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={searchAddress}
                          className="bg-transparent"
                        >
                          Buscar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={getCurrentLocation}
                          disabled={isLocating}
                          className="bg-transparent"
                        >
                          {isLocating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Navigation className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Interactive Map */}
                      <div 
                        ref={mapRef}
                        onClick={handleMapClick}
                        className="relative w-full h-72 bg-secondary rounded-lg overflow-hidden cursor-crosshair border border-border"
                      >
                        {/* Map Background (simplified visual) */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 via-green-50/30 to-blue-50/50" />
                        
                        {/* Grid lines */}
                        <div className="absolute inset-0" style={{
                          backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
                          backgroundSize: "20px 20px"
                        }} />

                        {/* Zone markers */}
                        {deliveryZones.slice(0, 5).map((zone, index) => (
                          <div
                            key={zone.id}
                            className={`absolute w-3 h-3 rounded-full transition-all ${
                              selectedZone?.id === zone.id
                                ? "bg-primary scale-150 ring-4 ring-primary/30"
                                : "bg-primary/40"
                            }`}
                            style={{
                              left: `${20 + index * 15}%`,
                              top: `${30 + (index % 3) * 20}%`,
                            }}
                            title={zone.name}
                          />
                        ))}

                        {/* User marker */}
                        {markerPosition && (
                          <div
                            className="absolute transform -translate-x-1/2 -translate-y-full z-10"
                            style={{
                              left: `${50 + (markerPosition.lng + 78.5) * 100}%`,
                              top: `${50 + (markerPosition.lat + 0.2) * 100}%`,
                            }}
                          >
                            <div className="relative">
                              <MapPin className="h-8 w-8 text-primary fill-primary/20" />
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-ping" />
                            </div>
                          </div>
                        )}

                        {/* Map labels */}
                        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-medium text-foreground">
                          Quito, Ecuador
                        </div>

                        {/* Instructions */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded text-xs text-muted-foreground">
                          Haz clic en el mapa para seleccionar tu ubicacion
                        </div>
                      </div>

                      {/* Zone Info */}
                      {selectedZone && (
                        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{selectedZone.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Entrega estimada: {selectedZone.deliveryDays} dias habiles
                            </p>
                            <p className="text-sm text-primary font-medium mt-1">
                              {shipping === 0 ? "Envio gratis!" : `Costo de envio: $${shipping.toFixed(2)}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {showZoneWarning && (
                        <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-destructive">Zona no disponible</p>
                            <p className="text-sm text-muted-foreground">
                              Lo sentimos, actualmente no hacemos entregas en esta zona. Por favor selecciona una ubicacion dentro de nuestras zonas de cobertura.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Address Form */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="fullName">Nombre Completo *</Label>
                        <Input
                          id="fullName"
                          value={addressData.fullName}
                          onChange={(e) => setAddressData({ ...addressData, fullName: e.target.value })}
                          placeholder="Juan Perez"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefono *</Label>
                        <Input
                          id="phone"
                          value={addressData.phone}
                          onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                          placeholder="+593 99 123 4567"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Input
                          id="city"
                          value={addressData.city}
                          onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                          placeholder="Selecciona en el mapa"
                          className="bg-background border-border"
                          readOnly
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="street">Direccion (Calle principal y numero) *</Label>
                        <Input
                          id="street"
                          value={addressData.street}
                          onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                          placeholder="Av. Amazonas N32-45"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="reference">Referencia (opcional)</Label>
                        <Input
                          id="reference"
                          value={addressData.reference}
                          onChange={(e) => setAddressData({ ...addressData, reference: e.target.value })}
                          placeholder="Edificio azul, junto a la farmacia..."
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => setCurrentStep("pago")}
                      disabled={!canProceedToPayment}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Continuar al Pago
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 2: Payment */}
              {currentStep === "pago" && (
                <>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h2 className="font-serif text-xl text-foreground mb-6">Informacion de Pago</h2>
                    
                    {/* Card Preview */}
                    <div className="mb-8">
                      <div className="relative w-full max-w-sm h-48 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-xl p-6 text-primary-foreground shadow-lg">
                        <div className="absolute top-4 right-4">
                          <CreditCard className="h-8 w-8 opacity-50" />
                        </div>
                        <div className="absolute bottom-6 left-6 right-6">
                          <p className="text-lg tracking-widest mb-4 font-mono">
                            {paymentData.cardNumber || "•••• •••• •••• ••••"}
                          </p>
                          <div className="flex justify-between">
                            <div>
                              <p className="text-xs opacity-70">Titular</p>
                              <p className="text-sm font-medium uppercase">
                                {paymentData.cardName || "TU NOMBRE"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs opacity-70">Expira</p>
                              <p className="text-sm font-medium">
                                {paymentData.expiry || "MM/AA"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Numero de Tarjeta</Label>
                        <Input
                          id="cardNumber"
                          value={paymentData.cardNumber}
                          onChange={(e) => setPaymentData({ ...paymentData, cardNumber: formatCardNumber(e.target.value) })}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Nombre en la Tarjeta</Label>
                        <Input
                          id="cardName"
                          value={paymentData.cardName}
                          onChange={(e) => setPaymentData({ ...paymentData, cardName: e.target.value.toUpperCase() })}
                          placeholder="JUAN PEREZ"
                          className="bg-background border-border uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Fecha de Expiracion</Label>
                          <Input
                            id="expiry"
                            value={paymentData.expiry}
                            onChange={(e) => setPaymentData({ ...paymentData, expiry: formatExpiry(e.target.value) })}
                            placeholder="MM/AA"
                            maxLength={5}
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            value={paymentData.cvv}
                            onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                            placeholder="123"
                            maxLength={4}
                            type="password"
                            className="bg-background border-border"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Security Note */}
                    <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span>Tu informacion de pago esta protegida con encriptacion SSL</span>
                    </div>
                  </div>

                  {/* Shipping Address Summary */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-foreground">Direccion de Envio</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep("direccion")}
                        className="text-primary"
                      >
                        Editar
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="text-foreground font-medium">{addressData.fullName}</p>
                      <p>{addressData.street}</p>
                      {addressData.reference && <p>{addressData.reference}</p>}
                      <p>{addressData.city}</p>
                      <p>{addressData.phone}</p>
                    </div>
                  </div>

                  {orderError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive mb-4">
                      {orderError}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("direccion")}
                      className="bg-transparent"
                    >
                      Volver
                    </Button>
                    <Button
                      onClick={handleProcessPayment}
                      disabled={!canProceedToConfirm || isProcessing}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          Pagar ${total.toFixed(2)}
                          <Lock className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === "confirmacion" && (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <Check className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="font-serif text-2xl text-foreground mb-2">Pago Exitoso!</h2>
                  <p className="text-muted-foreground mb-6">
                    Tu pedido ha sido confirmado y esta siendo procesado.
                  </p>
                  
                  <div className="bg-secondary rounded-lg p-4 mb-6 max-w-sm mx-auto">
                    <p className="text-sm text-muted-foreground">Numero de Pedido</p>
                    <p className="text-xl font-mono font-bold text-foreground">{createdOrderId ? createdOrderId.slice(0, 13).toUpperCase() : "---"}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
                    <Package className="h-4 w-4" />
                    <span>Entrega estimada: {selectedZone?.deliveryDays || "2-3"} dias habiles</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href="/orders">Ver Mis Pedidos</Link>
                    </Button>
                    <Button asChild variant="outline" className="bg-transparent">
                      <Link href="/products">Seguir Comprando</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h3 className="font-serif text-lg text-foreground mb-4">Resumen del Pedido</h3>
                
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={item.imagen_url || "/placeholder.svg"}
                          alt={item.nombre}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute -top-1 -right-1 bg-foreground text-background text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {item.cantidad}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                        <p className="text-sm text-foreground">${Number(item.precio).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envio</span>
                    <span className={shipping === 0 ? "text-green-600 font-medium" : "text-foreground"}>
                      {shipping === 0 ? "Gratis" : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-border pt-3">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Delivery Info */}
                {selectedZone && currentStep !== "confirmacion" && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      <span>Entrega: {selectedZone.deliveryDays} dias - {selectedZone.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
