"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { CartProvider } from "@/contexts/cart-context"
import { StoreConfigProvider } from "@/contexts/store-config-context"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <StoreConfigProvider>
          <CartProvider>{children}</CartProvider>
        </StoreConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
