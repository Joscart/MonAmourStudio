"use client"

import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck, Shield } from "lucide-react"
import { useCart } from "@/contexts/cart-context"

export default function CartPage() {
  const { items, totalItems, subtotal, removeItem, updateQuantity } = useCart()

  const shipping = subtotal > 100 ? 0 : 9.99
  const total = subtotal + shipping

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
              Tu Carrito de Compras
            </h1>
            <p className="text-muted-foreground">
              {items.length === 0
                ? "Tu carrito esta vacio"
                : `Tienes ${totalItems} productos en tu carrito`}
            </p>
          </div>

          {items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-16 bg-secondary rounded-lg">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-serif text-2xl text-foreground mb-2">Tu carrito esta vacio</h2>
              <p className="text-muted-foreground mb-6">
                Parece que aun no has agregado productos a tu carrito.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/products">
                  Explorar Productos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-card rounded-lg border border-border"
                  >
                    {/* Product Image */}
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-md overflow-hidden">
                      <Image
                        src={item.imagen_url || "/placeholder.svg"}
                        alt={item.nombre}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            {item.sku}
                          </p>
                          <h3 className="font-serif text-lg text-foreground mb-1">
                            {item.nombre}
                          </h3>
                          <p className="text-primary font-medium">
                            ${Number(item.precio).toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Eliminar producto"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                          className="p-1 border border-border rounded hover:bg-secondary transition-colors"
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                          className="p-1 border border-border rounded hover:bg-secondary transition-colors"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="ml-auto text-foreground font-medium">
                          ${(Number(item.precio) * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Continue Shopping */}
                <Link
                  href="/products"
                  className="inline-flex items-center text-sm text-primary hover:text-primary/80 mt-4"
                >
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  Continuar comprando
                </Link>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-lg border border-border p-6 sticky top-24">
                  <h2 className="font-serif text-xl text-foreground mb-6">Resumen del Pedido</h2>

                  {/* Price Breakdown */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envio</span>
                      <span className="text-foreground">
                        {shipping === 0 ? "Gratis" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-medium border-t border-border pt-3">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button asChild className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/payment">
                      Proceder al Pago
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-6 border-t border-border space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Truck className="h-5 w-5 text-primary" />
                      <span>Envio gratis en pedidos mayores a $100</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Shield className="h-5 w-5 text-primary" />
                      <span>Pago seguro garantizado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
