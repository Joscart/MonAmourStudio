"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Star,
  Upload,
  X,
  ZoomIn,
  RotateCcw,
  Move,
  ChevronLeft,
  ChevronRight,
  Check,
  Truck,
  Shield,
  Gift,
} from "lucide-react"
import { inventoryApi } from "@/lib/api"
import { useCart } from "@/contexts/cart-context"
import type { ProductoResponse } from "@/lib/types"

const frameSizes = [
  { id: "s", label: "Pequeno", dimensions: "15x20cm", priceModifier: 0 },
  { id: "m", label: "Mediano", dimensions: "20x25cm", priceModifier: 20 },
  { id: "l", label: "Grande", dimensions: "25x30cm", priceModifier: 40 },
  { id: "xl", label: "Extra Grande", dimensions: "30x40cm", priceModifier: 70 },
]

export default function ProductPage() {
  const params = useParams()
  const productId = params.id as string
  
  const [product, setProduct] = useState<ProductoResponse | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductoResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState("m")
  const [isLiked, setIsLiked] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 })
  const [imageScale, setImageScale] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })

  const { addItem } = useCart()

  useEffect(() => {
    setIsLoading(true)
    inventoryApi
      .get(productId)
      .then((p) => {
        setProduct(p)
        return inventoryApi.list({ limit: 5 })
      })
      .then((all) => setRelatedProducts(all.filter((p) => p.id !== productId).slice(0, 4)))
      .catch(() => setProduct(null))
      .finally(() => setIsLoading(false))
  }, [productId])

  const selectedSizeData = frameSizes.find(s => s.id === selectedSize)!
  const finalPrice = product.precio + selectedSizeData.priceModifier

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setImagePosition({ x: 50, y: 50 })
        setImageScale(100)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    dragStartRef.current = { x: clientX - imagePosition.x * 2, y: clientY - imagePosition.y * 2 }
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    
    const newX = Math.max(0, Math.min(100, (clientX - dragStartRef.current.x) / 2))
    const newY = Math.max(0, Math.min(100, (clientY - dragStartRef.current.y) / 2))
    
    setImagePosition({ x: newX, y: newY })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const resetImage = () => {
    setImagePosition({ x: 50, y: 50 })
    setImageScale(100)
  }

  const removeImage = () => {
    setUploadedImage(null)
    setImagePosition({ x: 50, y: 50 })
    setImageScale(100)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener("mouseup", handleGlobalMouseUp)
    window.addEventListener("touchend", handleGlobalMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
      window.removeEventListener("touchend", handleGlobalMouseUp)
    }
  }, [])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-3 text-muted-foreground">Cargando producto...</span>
        </div>
        <Footer />
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-xl text-muted-foreground">Producto no encontrado</p>
          <Link href="/products" className="text-primary hover:underline">Volver a productos</Link>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/products" className="hover:text-primary transition-colors">Productos</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{product.nombre}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Product Images & Preview */}
            <div className="space-y-6">
              {/* Main Image / Preview Area */}
              <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden">
                {uploadedImage && showPreview ? (
                  <div 
                    ref={previewContainerRef}
                    className="absolute inset-0 cursor-move"
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    {/* Frame overlay */}
                    <Image
                      src={product.imagen_url || "/placeholder.svg"}
                      alt={product.nombre}
                      fill
                      className="object-cover pointer-events-none z-10"
                      style={{ mixBlendMode: "multiply", opacity: 0.9 }}
                    />
                    {/* User uploaded image */}
                    <div 
                      className="absolute inset-[15%] overflow-hidden"
                      style={{
                        transform: `scale(${imageScale / 100})`,
                      }}
                    >
                      <Image
                        src={uploadedImage || "/placeholder.svg"}
                        alt="Tu imagen"
                        fill
                        className="object-cover"
                        style={{
                          objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                        }}
                      />
                    </div>
                    {/* Drag indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-foreground/80 text-background text-xs px-3 py-1.5 rounded-full flex items-center gap-2 z-20">
                      <Move className="h-3 w-3" />
                      Arrastra para ajustar
                    </div>
                  </div>
                ) : (
                  <Image
                    src={product.imagen_url || "/placeholder.svg"}
                    alt={product.nombre}
                    fill
                    className="object-cover"
                  />
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                  {product.stock < 5 && product.stock > 0 && (
                    <span className="bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded">
                      ULTIMAS {product.stock} UNIDADES
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs font-medium px-3 py-1 rounded">
                      AGOTADO
                    </span>
                  )}
                </div>

                {/* Preview toggle */}
                {uploadedImage && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm p-2 rounded-full z-20 hover:bg-card transition-colors"
                  >
                    <ZoomIn className="h-5 w-5 text-foreground" />
                  </button>
                )}
              </div>

              {/* Image Controls (when preview is active) */}
              {uploadedImage && showPreview && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-foreground">Ajustar Imagen</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetImage}
                        className="p-2 hover:bg-secondary rounded transition-colors"
                        title="Restablecer posicion"
                      >
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-2 hover:bg-destructive/10 rounded transition-colors"
                        title="Eliminar imagen"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Zoom: {imageScale}%</label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={imageScale}
                        onChange={(e) => setImageScale(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Section */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-serif text-lg text-foreground mb-3">Personaliza Tu Marco</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sube una imagen para ver como se vera en este marco. La imagen es temporal y no se guardara.
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {!uploadedImage ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                      <Upload className="h-10 w-10" />
                      <span className="font-medium">Haz clic para subir tu imagen</span>
                      <span className="text-xs">PNG, JPG hasta 10MB</span>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={uploadedImage || "/placeholder.svg"}
                        alt="Imagen subida"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Imagen cargada</p>
                      <p className="text-xs text-muted-foreground">Lista para previsualizar</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="bg-transparent"
                      >
                        <ZoomIn className="h-4 w-4 mr-2" />
                        Ver en Marco
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-transparent"
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <p className="text-accent font-medium tracking-wide text-sm mb-2">{product.sku}</p>
                <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">{product.nombre}</h1>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">(48 resenas)</span>
                </div>

                <p className="text-muted-foreground leading-relaxed">{product.descripcion}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl text-foreground">${finalPrice.toFixed(2)}</span>
                {selectedSizeData.priceModifier > 0 && (
                  <span className="text-sm text-muted-foreground line-through">${product.precio.toFixed(2)}</span>
                )}
              </div>

              {/* Size Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Tamano: <span className="text-muted-foreground font-normal">{selectedSizeData.dimensions}</span>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {frameSizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size.id)}
                      className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                        selectedSize === size.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {size.label}
                      {size.priceModifier > 0 && (
                        <span className="block text-xs text-muted-foreground mt-0.5">+${size.priceModifier}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Cantidad</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-secondary transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-secondary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-2">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                  disabled={product.stock === 0}
                  onClick={() => {
                    addItem({
                      id: product.id,
                      nombre: product.nombre,
                      precio: finalPrice,
                      imagen_url: product.imagen_url,
                      sku: product.sku,
                      cantidad: quantity,
                    })
                  }}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Agregar al Carrito
                </Button>
                <button
                  type="button"
                  onClick={() => setIsLiked(!isLiked)}
                  className={`h-12 w-12 flex items-center justify-center border rounded-lg transition-colors ${
                    isLiked 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-border">
                <div className="text-center">
                  <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs text-muted-foreground">Envio Gratis</p>
                  <p className="text-xs text-foreground font-medium">desde $100</p>
                </div>
                <div className="text-center">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs text-muted-foreground">Garantia</p>
                  <p className="text-xs text-foreground font-medium">30 dias</p>
                </div>
                <div className="text-center">
                  <Gift className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs text-muted-foreground">Empaque</p>
                  <p className="text-xs text-foreground font-medium">de regalo</p>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-foreground">Detalles del Producto</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">SKU</p>
                    <p className="text-foreground font-medium">{product.sku}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Moneda</p>
                    <p className="text-foreground font-medium">{product.moneda}</p>
                  </div>
                </div>
                {product.descripcion && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Descripcion</p>
                    <p className="text-sm text-foreground leading-relaxed">{product.descripcion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          <div className="mt-20">
            <h2 className="font-serif text-2xl text-foreground mb-8">Productos Relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/product/${relatedProduct.id}`}
                  className="group"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                    <Image
                      src={relatedProduct.imagen_url || "/placeholder.svg"}
                      alt={relatedProduct.nombre}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
                    {relatedProduct.nombre}
                  </h3>
                  <p className="text-primary font-medium">${relatedProduct.precio.toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
