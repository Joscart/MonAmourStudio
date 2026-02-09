"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, ShoppingBag, Search, Heart, User, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const { totalItems } = useCart()

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
            <Link href="/collections" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors">
              COLECCIONES
            </Link>
            <Link href="/monamour" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors">
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
            <Link href="/search" className="p-2 text-foreground hover:text-primary transition-colors" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Link>
            <Link href="/account?tab=favoritos" className="hidden sm:block p-2 text-foreground hover:text-primary transition-colors" aria-label="Favoritos">
              <Heart className="h-5 w-5" />
            </Link>
            {isAuthenticated ? (
              <Link href="/account" className="p-2 text-foreground hover:text-primary transition-colors" aria-label="Mi cuenta" title={user?.nombre}>
                <User className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login" className="p-2 text-foreground hover:text-primary transition-colors" aria-label="Iniciar sesion">
                <User className="h-5 w-5" />
              </Link>
            )}
            <Link href="/cart" className="p-2 text-foreground hover:text-primary transition-colors relative" aria-label="Carrito">
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
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
            <Link href="/collections" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              COLECCIONES
            </Link>
            <Link href="/monamour" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              NOSOTROS
            </Link>
            <Link href="/search" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
              BUSCAR
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/account" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
                  MI CUENTA ({user?.nombre})
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm tracking-wide text-destructive hover:text-destructive/80 transition-colors py-2 text-left flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  CERRAR SESION
                </button>
              </>
            ) : (
              <Link href="/login" className="text-sm tracking-wide text-foreground hover:text-primary transition-colors py-2">
                INICIAR SESION
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
