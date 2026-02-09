"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react"
import { inventoryApi } from "@/lib/api"
import { useCart } from "@/contexts/cart-context"
import type { ProductoResponse } from "@/lib/types"

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductoResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("relevancia")
  const { addItem } = useCart()

  useEffect(() => {
    inventoryApi
      .list()
      .then(setProducts)
      .catch((err) => setError(err.message ?? "Error al cargar productos"))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredProducts = products
    .filter((p) => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "precio-menor") return a.precio - b.precio
      if (sortBy === "precio-mayor") return b.precio - a.precio
      if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre)
      return 0
    })

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-accent font-medium tracking-widest text-sm mb-3">NUESTRA TIENDA</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-foreground mb-4">
              Todos los Productos
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explora nuestra coleccion completa de marcos premium y regalos personalizados, 
              disenados para capturar tus momentos mas especiales.
            </p>
          </div>
        </div>
      </section>

      {/* Filters and Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search and Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-md text-sm text-foreground"
            >
              <option value="relevancia">Relevancia</option>
              <option value="precio-menor">Precio: Menor a Mayor</option>
              <option value="precio-mayor">Precio: Mayor a Menor</option>
              <option value="nombre">Nombre A-Z</option>
            </select>
          </div>

          {/* Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredProducts.length} productos
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="text-primary"
                >
                  Limpiar busqueda
                  <X className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Cargando productos...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-destructive mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => { setIsLoading(true); setError(null); inventoryApi.list().then(setProducts).catch((e) => setError(e.message)).finally(() => setIsLoading(false)) }}
                  className="bg-transparent"
                >
                  Reintentar
                </Button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.nombre}
                    price={product.precio}
                    image={product.imagen_url || "/placeholder.svg"}
                    onAddToCart={() =>
                      addItem({
                        id: product.id,
                        nombre: product.nombre,
                        precio: product.precio,
                        imagen_url: product.imagen_url,
                        sku: product.sku,
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  No se encontraron productos que coincidan con tu busqueda.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="bg-transparent"
                >
                  Ver todos los productos
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
