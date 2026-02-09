"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useStoreConfig } from "@/contexts/store-config-context"

export function NewsletterSection() {
  const { config } = useStoreConfig()

  // Hide section if no WhatsApp channel URL is defined
  if (!config.whatsapp_url) return null

  return (
    <section className="py-20 lg:py-28 bg-secondary">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-accent font-medium tracking-widest text-sm mb-3">MANTENTE CONECTADO</p>
        <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">Unete a Nuestra Comunidad</h2>
        <p className="text-muted-foreground mb-8">
          Unite a nuestro canal de difusion de WhatsApp para recibir ofertas exclusivas, novedades y promociones directamente en tu celular.
        </p>

        <a href={config.whatsapp_url} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-[#25D366] hover:bg-[#20BD5A] text-white">
            <MessageCircle className="mr-2 h-5 w-5" />
            Unirme al Canal de WhatsApp
          </Button>
        </a>

        <p className="text-xs text-muted-foreground mt-4">
          Recibe novedades y promociones exclusivas. Puedes salir del canal en cualquier momento.
        </p>
      </div>
    </section>
  )
}
