"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProductCardProps {
  id: string
  name: string
  price: number
  image: string
  category?: string
  isNew?: boolean
  isBestseller?: boolean
  onAddToCart?: () => void
}

export function ProductCard({ 
  id,
  name, 
  price, 
  image, 
  category,
  isNew,
  isBestseller,
  onAddToCart,
}: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <Link href={`/product/${id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-secondary mb-4">
          <Image
            src={image || "/placeholder.svg"}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isNew && (
              <span className="bg-accent text-accent-foreground text-xs font-medium px-2.5 py-1 rounded">
                NUEVO
              </span>
            )}
            {isBestseller && (
              <span className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded">
                MAS VENDIDO
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setIsLiked(!isLiked) }}
            className="absolute top-3 right-3 p-2 bg-card/80 backdrop-blur-sm rounded-full transition-all hover:bg-card"
            aria-label={isLiked ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${isLiked ? "fill-primary text-primary" : "text-foreground"}`} 
            />
          </button>

          {/* Quick Add Button */}
          <div 
            className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Button
              className="w-full bg-card/95 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground"
              onClick={(e) => { e.preventDefault(); onAddToCart?.() }}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Agregar al Carrito
            </Button>
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <Link href={`/product/${id}`} className="block space-y-1">
        {category && (
          <p className="text-xs text-muted-foreground tracking-wider uppercase">{category}</p>
        )}
        <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-foreground font-medium">${price.toFixed(2)}</p>
      </Link>
    </div>
  )
}
