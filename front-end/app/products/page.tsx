"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal, X } from "lucide-react"

const allProducts = [
  {
    id: "1",
    name: "Marco Romance Dorado",
    price: 89.00,
    image: "/images/frame-1.jpg",
    category: "Marcos Premium",
    isBestseller: true,
  },
  {
    id: "2",
    name: "Marco Flotante Oro Rosa",
    price: 125.00,
    image: "/images/frame-2.jpg",
    category: "Coleccion Bodas",
    isNew: true,
  },
  {
    id: "3",
    name: "Marco Barroco Vintage",
    price: 145.00,
    image: "/images/frame-3.jpg",
    category: "Coleccion Clasica",
  },
  {
    id: "4",
    name: "Marco Acrilico Moderno",
    price: 75.00,
    image: "/images/frame-4.jpg",
    category: "Contemporaneo",
    isNew: true,
  },
  {
    id: "5",
    name: "Marco Plata Grabado",
    price: 165.00,
    image: "/images/frame-5.jpg",
    category: "Regalos Aniversario",
    isBestseller: true,
  },
  {
    id: "6",
    name: "Marco Vidrio Doble Cara",
    price: 110.00,
    image: "/images/frame-6.jpg",
    category: "Marcos Premium",
  },
  {
    id: "7",
    name: "Marco Corazon Rosa",
    price: 95.00,
    image: "/images/frame-1.jpg",
    category: "San Valentin",
    isNew: true,
  },
  {
    id: "8",
    name: "Marco Madera Natural",
    price: 85.00,
    image: "/images/frame-2.jpg",
    category: "Rustico",
  },
  {
    id: "9",
    name: "Marco Espejo Elegante",
    price: 135.00,
    image: "/images/frame-3.jpg",
    category: "Coleccion Clasica",
    isBestseller: true,
  },
]

const categories = [
  "Todos",
  "Marcos Premium",
  "Coleccion Bodas",
  "Coleccion Clasica",
  "Contemporaneo",
  "Regalos Aniversario",
  "San Valentin",
  "Rustico",
]

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState("relevancia")

  const filteredProducts = allProducts
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "precio-menor") return a.price - b.price
      if (sortBy === "precio-mayor") return b.price - a.price
      if (sortBy === "nombre") return a.name.localeCompare(b.name)
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
          {/* Search and Filter Bar */}
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
            <div className="flex gap-2">
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
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden bg-transparent"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="font-serif text-lg text-foreground mb-4">Categorias</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Mobile Filters */}
            {showFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-foreground/50" onClick={() => setShowFilters(false)} />
                <div className="absolute right-0 top-0 bottom-0 w-80 bg-background p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-lg text-foreground">Filtros</h3>
                    <button type="button" onClick={() => setShowFilters(false)}>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <h4 className="font-medium text-foreground mb-3">Categorias</h4>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category)
                          setShowFilters(false)
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedCategory === category
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredProducts.length} productos
                </p>
                {selectedCategory !== "Todos" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory("Todos")}
                    className="text-primary"
                  >
                    Limpiar filtros
                    <X className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">
                    No se encontraron productos que coincidan con tu busqueda.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedCategory("Todos")
                    }}
                    className="bg-transparent"
                  >
                    Ver todos los productos
                  </Button>
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
