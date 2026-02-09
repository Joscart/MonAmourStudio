"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { inventoryApi, productTypesApi, favoritesApi } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"
import type { ProductoResponse, TipoProductoResponse } from "@/lib/types"
import { Search, Loader2, ShoppingBag, Heart, Grid3X3, X } from "lucide-react"

export default function CollectionsPage() {
  const { user, isAuthenticated } = useAuth()
  const { addItem } = useCart()

  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<ProductoResponse[]>([])
  const [tipos, setTipos] = useState<TipoProductoResponse[]>([])
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [favIds, setFavIds] = useState<string[]>([])

  // Load products and types
  useEffect(() => {
    Promise.all([
      inventoryApi.list({ limit: 200 }),
      productTypesApi.list().catch(() => [] as TipoProductoResponse[]),
    ])
      .then(([prods, tps]) => {
        setProducts(prods)
        setTipos(tps)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load favorites
  useEffect(() => {
    if (isAuthenticated && user) {
      favoritesApi.listIds(user.id).then(setFavIds).catch(() => {})
    }
  }, [isAuthenticated, user])

  const handleToggleFav = async (productId: string) => {
    if (!isAuthenticated || !user) return
    try {
      const result = await favoritesApi.toggle(productId, user.id)
      setFavIds((prev) =>
        result.favorited ? [...prev, productId] : prev.filter((id) => id !== productId),
      )
    } catch {}
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !query.trim() ||
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(query.toLowerCase()))
    const matchesTipo = !selectedTipo || p.tipo_producto_id === selectedTipo
    return matchesSearch && matchesTipo
  })

  // Group by tipo for display
  const tiposWithCount = tipos.map((t) => ({
    ...t,
    count: products.filter((p) => p.tipo_producto_id === t.id).length,
  })).filter((t) => t.count > 0)

  const uncategorizedCount = products.filter((p) => !p.tipo_producto_id).length

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Colecciones</h1>
            <p className="text-muted-foreground">
              Explora nuestras colecciones curadas por categoria. Encuentra la pieza perfecta para cada ocasion.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en colecciones..."
              className="pl-11 bg-card border-border h-11"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              type="button"
              onClick={() => setSelectedTipo(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedTipo
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              Todas ({products.length})
            </button>
            {tiposWithCount.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTipo(selectedTipo === t.id ? null : t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTipo === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {t.nombre} ({t.count})
              </button>
            ))}
            {uncategorizedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTipo("__none__")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTipo === "__none__"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                Sin categoria ({uncategorizedCount})
              </button>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-secondary/30 rounded-lg">
              <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-xl text-foreground mb-2">Sin productos</h3>
              <p className="text-muted-foreground">
                {query || selectedTipo
                  ? "No encontramos productos con esos filtros. Intenta con otros."
                  : "Aun no hay productos en el catalogo."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
                {selectedTipo && selectedTipo !== "__none__" && tipos.find((t) => t.id === selectedTipo)
                  ? ` en "${tipos.find((t) => t.id === selectedTipo)!.nombre}"`
                  : selectedTipo === "__none__"
                    ? " sin categoria"
                    : ""}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts
                  .filter((p) => {
                    if (selectedTipo === "__none__") return !p.tipo_producto_id
                    return true
                  })
                  .map((p) => {
                    const isFav = favIds.includes(p.id)
                    const hasDiscount = p.descuento_porcentaje && p.descuento_porcentaje > 0
                    const finalPrice = hasDiscount ? p.precio * (1 - p.descuento_porcentaje! / 100) : p.precio
                    return (
                      <div key={p.id} className="bg-card rounded-lg border border-border overflow-hidden group">
                        <Link href={`/product/${p.id}`}>
                          <div className="relative aspect-square bg-secondary">
                            <Image
                              src={p.imagen_url || "/placeholder.svg"}
                              alt={p.nombre}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            {hasDiscount && (
                              <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                                -{p.descuento_porcentaje}%
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="p-4">
                          <Link href={`/product/${p.id}`}>
                            <h3 className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                              {p.nombre}
                            </h3>
                          </Link>
                          {p.tipo_producto_nombre && (
                            <p className="text-xs text-muted-foreground mt-0.5">{p.tipo_producto_nombre}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-baseline gap-2">
                              <span className="text-primary font-medium">${finalPrice.toFixed(2)}</span>
                              {hasDiscount && (
                                <span className="text-xs text-muted-foreground line-through">${p.precio.toFixed(2)}</span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {isAuthenticated && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleFav(p.id)}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    isFav ? "text-red-500 bg-red-50" : "text-muted-foreground hover:text-red-500"
                                  }`}
                                >
                                  <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  addItem({
                                    id: p.id,
                                    nombre: p.nombre,
                                    precio: finalPrice,
                                    imagen_url: p.imagen_url,
                                    cantidad: 1,
                                    sku: p.sku,
                                    max_por_pedido: p.max_por_pedido,
                                  })
                                }
                                className="p-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ShoppingBag className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
