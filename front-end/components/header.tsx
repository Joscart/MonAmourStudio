"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, ShoppingBag, Search, Heart, User } from "lucide-react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Abrir menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop Navigation Left */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors">
              TIENDA
            </Link>
            <Link href="#colecciones" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors">
              COLECCIONES
            </Link>
            <Link href="#nosotros" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors">
              NOSOTROS
            </Link>
          </nav>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/image.png"
              alt="Mon Amour Studio"
              width={120}
              height={60}
              className="h-12 md:h-14 w-auto"
              priority
            />
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-2 md:gap-4">
            <button type="button" className="p-2 text-foreground hover:text-primary transition-colors" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </button>
            <button type="button" className="hidden sm:block p-2 text-foreground hover:text-primary transition-colors" aria-label="Favoritos">
              <Heart className="h-5 w-5" />
            </button>
            <Link href="/account" className="p-2 text-foreground hover:text-primary transition-colors" aria-label="Mi cuenta">
              <User className="h-5 w-5" />
            </Link>
            <Link href="/cart" className="p-2 text-foreground hover:text-primary transition-colors relative" aria-label="Carrito">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <nav className="px-4 py-4 flex flex-col gap-4">
            <Link href="/products" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              TIENDA
            </Link>
            <Link href="#colecciones" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              COLECCIONES
            </Link>
            <Link href="#nosotros" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              NOSOTROS
            </Link>
            <Link href="#contacto" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              CONTACTO
            </Link>
            <Link href="/account" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              MI CUENTA
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
