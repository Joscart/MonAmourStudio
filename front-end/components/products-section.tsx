"use client"

import { useState, useEffect } from "react"
import { ProductCard } from "@/components/product-card"
import { ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { inventoryApi } from "@/lib/api"
import { useCart } from "@/contexts/cart-context"
import type { ProductoResponse } from "@/lib/types"

export function ProductsSection() {
  const [products, setProducts] = useState<ProductoResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    inventoryApi
      .list({ limit: 6 })
      .then(setProducts)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])
  return (
    <section id="tienda" className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-accent font-medium tracking-widest text-sm mb-3">NUESTRA COLECCION</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground text-balance mb-4">
            Marcos Personalizados Premium
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cada marco esta elaborado con los mejores materiales y meticulosa atencion al detalle, 
            disenado para mostrar bellamente tus recuerdos mas preciados.
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.nombre}
                price={product.precio}
                image={product.imagen_url || "/placeholder.svg"}
                disponibilidad={product.disponibilidad}
                maxPorPedido={product.max_por_pedido}
                onAddToCart={() =>
                  addItem({
                    id: product.id,
                    nombre: product.nombre,
                    precio: product.precio,
                    imagen_url: product.imagen_url,
                    sku: product.sku,
                    max_por_pedido: product.max_por_pedido,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-12">
            <p className="text-muted-foreground">Cargando productos...</p>
          </div>
        )}

        {/* View All Button */}
        <div className="text-center">
          <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent">
            <Link href="/products">
              Ver Todos los Productos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
