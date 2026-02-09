"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface StoreConfig {
  id?: string | null
  logo_url: string | null
  email_contacto: string | null
  email_soporte: string | null
  telefono_contacto: string | null
  telefono_soporte: string | null
  envio_gratis_desde: number | null
  costo_envio: number | null
  instagram_url: string | null
  tiktok_url: string | null
  whatsapp_url: string | null
  color_primary_h: number
  color_primary_s: number
  color_primary_l: number
  color_accent_h: number
  color_accent_s: number
  color_accent_l: number
}

const defaultConfig: StoreConfig = {
  logo_url: null,
  email_contacto: null,
  email_soporte: null,
  telefono_contacto: null,
  telefono_soporte: null,
  envio_gratis_desde: null,
  costo_envio: null,
  instagram_url: null,
  tiktok_url: null,
  whatsapp_url: null,
  color_primary_h: 340,
  color_primary_s: 60,
  color_primary_l: 65,
  color_accent_h: 38,
  color_accent_s: 70,
  color_accent_l: 50,
}

interface StoreConfigContextValue {
  config: StoreConfig
  refresh: () => Promise<void>
}

const StoreConfigContext = createContext<StoreConfigContextValue>({
  config: defaultConfig,
  refresh: async () => {},
})

export function StoreConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>(defaultConfig)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns/tienda/config")
      if (res.ok) {
        const data = await res.json()
        setConfig({ ...defaultConfig, ...data })
      }
    } catch {
      // Use defaults if the API is not available
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Inject dynamic theme CSS variables whenever config changes
  useEffect(() => {
    const styleId = "dynamic-theme-vars"
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    const h = config.color_primary_h
    const s = config.color_primary_s
    const l = config.color_primary_l
    const ah = config.color_accent_h
    const as_ = config.color_accent_s
    const al = config.color_accent_l

    styleEl.textContent = `
      :root {
        --primary: ${h} ${s}% ${l}%;
        --ring: ${h} ${s}% ${l}%;
        --accent: ${ah} ${as_}% ${al}%;
        --background: ${h} 20% 98%;
        --foreground: ${h} 15% 15%;
        --card-foreground: ${h} 15% 15%;
        --popover-foreground: ${h} 15% 15%;
        --secondary: ${h} 15% 95%;
        --secondary-foreground: ${h} 15% 25%;
        --muted: ${h} 10% 94%;
        --muted-foreground: ${h} 10% 45%;
        --border: ${h} 15% 90%;
        --input: ${h} 15% 90%;
        --chart-1: ${h} ${s}% ${l}%;
        --chart-2: ${ah} ${as_}% ${al}%;
        --chart-3: ${h} 20% 80%;
        --chart-5: ${ah} 50% 60%;
        --sidebar-background: ${h} 20% 97%;
        --sidebar-foreground: ${h} 15% 25%;
        --sidebar-primary: ${h} ${s}% ${l}%;
        --sidebar-primary-foreground: 0 0% 100%;
        --sidebar-accent: ${h} 15% 94%;
        --sidebar-accent-foreground: ${h} 15% 25%;
        --sidebar-border: ${h} 15% 90%;
        --sidebar-ring: ${h} ${s}% ${l}%;
      }
      .dark {
        --primary: ${h} ${s}% ${l}%;
        --ring: ${h} ${s}% ${l}%;
        --accent: ${ah} ${as_}% ${al}%;
        --background: ${h} 15% 8%;
        --foreground: ${h} 10% 95%;
        --card: ${h} 15% 12%;
        --card-foreground: ${h} 10% 95%;
        --popover: ${h} 15% 12%;
        --popover-foreground: ${h} 10% 95%;
        --secondary: ${h} 15% 18%;
        --secondary-foreground: ${h} 10% 90%;
        --muted: ${h} 15% 18%;
        --muted-foreground: ${h} 10% 60%;
        --border: ${h} 15% 20%;
        --input: ${h} 15% 20%;
        --chart-1: ${h} ${s}% ${l}%;
        --chart-2: ${ah} ${as_}% ${al}%;
        --chart-3: ${h} 20% 40%;
        --chart-5: ${ah} 50% 60%;
        --sidebar-background: ${h} 15% 10%;
        --sidebar-foreground: ${h} 10% 90%;
        --sidebar-primary: ${h} ${s}% ${l}%;
        --sidebar-primary-foreground: 0 0% 100%;
        --sidebar-accent: ${h} 15% 18%;
        --sidebar-accent-foreground: ${h} 10% 90%;
        --sidebar-border: ${h} 15% 20%;
        --sidebar-ring: ${h} ${s}% ${l}%;
      }
    `
  }, [config])

  return (
    <StoreConfigContext.Provider value={{ config, refresh: fetchConfig }}>
      {children}
    </StoreConfigContext.Provider>
  )
}

export function useStoreConfig() {
  return useContext(StoreConfigContext)
}
