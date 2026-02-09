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
  facebook_url: string | null
  color_primary_h: number
  color_primary_s: number
  color_primary_l: number
  color_accent_h: number
  color_accent_s: number
  color_accent_l: number
  color_secondary_h: number
  color_secondary_s: number
  color_secondary_l: number
  atenuacion: number
  home_image_url: string | null
  login_image_url: string | null
  register_image_url: string | null
  about_image_url: string | null
  footer_light_text: boolean
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
  facebook_url: null,
  color_primary_h: 340,
  color_primary_s: 60,
  color_primary_l: 65,
  color_accent_h: 38,
  color_accent_s: 70,
  color_accent_l: 50,
  color_secondary_h: 220,
  color_secondary_s: 60,
  color_secondary_l: 50,
  atenuacion: 10,
  home_image_url: null,
  login_image_url: null,
  register_image_url: null,
  about_image_url: null,
  footer_light_text: true,
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
    const sh = config.color_secondary_h
    const ss = config.color_secondary_s
    const sl = config.color_secondary_l
    // atenuacion 0..50 → how much the secondary color tints the background
    const att = Math.max(0, Math.min(50, config.atenuacion))

    // Light mode: background tinted by secondary color
    const bgSat = Math.round((att / 50) * 25)
    const bgLit = Math.round(98 - (att / 50) * 5)
    const cardSat = Math.round((att / 50) * 18)
    const cardLit = Math.round(100 - (att / 50) * 3)
    const borderSat = Math.round(15 + (att / 50) * 10)
    const borderLit = Math.round(90 - (att / 50) * 4)

    // Dark mode tinting
    const darkBgLit = Math.round(8 + (att / 50) * 3)
    const darkBgSat = Math.round(15 + (att / 50) * 10)
    const darkCardLit = Math.round(12 + (att / 50) * 3)
    const darkBorderLit = Math.round(20 + (att / 50) * 3)

    styleEl.textContent = `
      :root {
        --primary: ${h} ${s}% ${l}%;
        --ring: ${h} ${s}% ${l}%;
        --accent: ${ah} ${as_}% ${al}%;
        --background: ${sh} ${bgSat}% ${bgLit}%;
        --foreground: ${sh} 15% 15%;
        --card: ${sh} ${cardSat}% ${cardLit}%;
        --card-foreground: ${sh} 15% 15%;
        --popover: ${sh} ${cardSat}% ${cardLit}%;
        --popover-foreground: ${sh} 15% 15%;
        --secondary: ${sh} ${Math.round(bgSat + 5)}% ${Math.round(bgLit - 3)}%;
        --secondary-foreground: ${sh} 15% 25%;
        --muted: ${sh} ${Math.round(bgSat + 2)}% ${Math.round(bgLit - 4)}%;
        --muted-foreground: ${sh} 10% 45%;
        --border: ${sh} ${borderSat}% ${borderLit}%;
        --input: ${sh} ${borderSat}% ${borderLit}%;
        --chart-1: ${h} ${s}% ${l}%;
        --chart-2: ${ah} ${as_}% ${al}%;
        --chart-3: ${sh} 20% 80%;
        --chart-5: ${ah} 50% 60%;
        --sidebar-background: ${sh} ${bgSat}% ${Math.round(bgLit - 1)}%;
        --sidebar-foreground: ${sh} 15% 25%;
        --sidebar-primary: ${h} ${s}% ${l}%;
        --sidebar-primary-foreground: 0 0% 100%;
        --sidebar-accent: ${sh} ${Math.round(bgSat + 2)}% ${Math.round(bgLit - 4)}%;
        --sidebar-accent-foreground: ${sh} 15% 25%;
        --sidebar-border: ${sh} ${borderSat}% ${borderLit}%;
        --sidebar-ring: ${h} ${s}% ${l}%;
      }
      .dark {
        --primary: ${h} ${s}% ${l}%;
        --ring: ${h} ${s}% ${l}%;
        --accent: ${ah} ${as_}% ${al}%;
        --background: ${sh} ${darkBgSat}% ${darkBgLit}%;
        --foreground: ${sh} 10% 95%;
        --card: ${sh} ${darkBgSat}% ${darkCardLit}%;
        --card-foreground: ${sh} 10% 95%;
        --popover: ${sh} ${darkBgSat}% ${darkCardLit}%;
        --popover-foreground: ${sh} 10% 95%;
        --secondary: ${sh} ${darkBgSat}% ${Math.round(darkCardLit + 6)}%;
        --secondary-foreground: ${sh} 10% 90%;
        --muted: ${sh} ${darkBgSat}% ${Math.round(darkCardLit + 6)}%;
        --muted-foreground: ${sh} 10% 60%;
        --border: ${sh} ${darkBgSat}% ${darkBorderLit}%;
        --input: ${sh} ${darkBgSat}% ${darkBorderLit}%;
        --chart-1: ${h} ${s}% ${l}%;
        --chart-2: ${ah} ${as_}% ${al}%;
        --chart-3: ${sh} 20% 40%;
        --chart-5: ${ah} 50% 60%;
        --sidebar-background: ${sh} ${darkBgSat}% ${Math.round(darkBgLit + 2)}%;
        --sidebar-foreground: ${sh} 10% 90%;
        --sidebar-primary: ${h} ${s}% ${l}%;
        --sidebar-primary-foreground: 0 0% 100%;
        --sidebar-accent: ${sh} ${darkBgSat}% ${Math.round(darkCardLit + 6)}%;
        --sidebar-accent-foreground: ${sh} 10% 90%;
        --sidebar-border: ${sh} ${darkBgSat}% ${darkBorderLit}%;
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
