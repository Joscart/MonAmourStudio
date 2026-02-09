"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { inventoryApi, favoritesApi } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"
import type { ProductoResponse } from "@/lib/types"
import { Search, Loader2, ShoppingBag, Heart, SlidersHorizontal, X } from "lucide-react"

function SearchPageInner() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const { user, isAuthenticated } = useAuth()
  const { addItem } = useCart()

  const [query, setQuery] = useState(initialQuery)
  const [products, setProducts] = useState<ProductoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [favIds, setFavIds] = useState<string[]>([])

  // Price filter
  const [showFilters, setShowFilters] = useState(false)
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  // Load favorites
  useEffect(() => {
    if (isAuthenticated && user) {
      favoritesApi.listIds(user.id).then(setFavIds).catch(() => {})
    }
  }, [isAuthenticated, user])

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !minPrice && !maxPrice) return
    setLoading(true)
    setSearched(true)
    try {
      const results = await inventoryApi.list({
        search: query.trim() || undefined,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        limit: 100,
      })
      setProducts(results)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [query, minPrice, maxPrice])

  // Search on initial load if query param exists
  useEffect(() => {
    if (initialQuery) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleFav = async (productId: string) => {
    if (!isAuthenticated || !user) return
    try {
      const result = await favoritesApi.toggle(productId, user.id)
      setFavIds((prev) =>
        result.favorited ? [...prev, productId] : prev.filter((id) => id !== productId),
      )
    } catch {}
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">Buscar Productos</h1>
            <p className="text-muted-foreground">Encuentra exactamente lo que estas buscando.</p>
          </div>

          {/* Search bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Buscar marcos, regalos, decoracion..."
                className="pl-11 bg-card border-border h-12 text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setProducts([]); setSearched(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              className="bg-transparent h-12 px-3"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6" onClick={handleSearch}>
              Buscar
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-card rounded-lg border border-border p-4 mb-6 flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Precio minimo</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="$0.00"
                  className="bg-background border-border h-9 w-36"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Precio maximo</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="$999.00"
                  className="bg-background border-border h-9 w-36"
                />
              </div>
              <Button size="sm" variant="outline" className="bg-transparent h-9" onClick={() => { setMinPrice(""); setMaxPrice("") }}>
                Limpiar filtros
              </Button>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : searched && products.length === 0 ? (
            <div className="text-center py-20 bg-secondary/30 rounded-lg">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-xl text-foreground mb-2">Sin resultados</h3>
              <p className="text-muted-foreground">
                No encontramos productos para &quot;{query}&quot;. Intenta con otros terminos.
              </p>
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {products.length} producto{products.length !== 1 ? "s" : ""} encontrado{products.length !== 1 ? "s" : ""}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((p) => {
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
          ) : !searched ? (
            <div className="text-center py-20">
              <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-foreground mb-2">Explora Nuestro Catalogo</h3>
              <p className="text-muted-foreground mb-6">
                Escribe un termino de busqueda para encontrar productos.
              </p>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/products">Ver Todos los Productos</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  )
}
