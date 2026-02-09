"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { CartItem } from "@/lib/types"

interface CartState {
  items: CartItem[]
  totalItems: number
  subtotal: number
  addItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, cantidad: number) => void
  clearCart: () => void
}

const STORAGE_KEY = "mon-amour-cart"

const CartContext = createContext<CartState | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  /* Hydrate from localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  /* Persist on change */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback(
    (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id)
        if (existing) {
          return prev.map((i) =>
            i.id === item.id
              ? { ...i, cantidad: i.cantidad + (item.cantidad ?? 1) }
              : i,
          )
        }
        return [...prev, { ...item, cantidad: item.cantidad ?? 1 }]
      })
    },
    [],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, cantidad: number) => {
    if (cantidad < 1) return
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad } : i)),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0)
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
