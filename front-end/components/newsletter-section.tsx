"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight } from "lucide-react"

export function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubmitted(true)
      setEmail("")
    }
  }

  return (
    <section className="py-20 lg:py-28 bg-secondary">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-accent font-medium tracking-widest text-sm mb-3">MANTENTE CONECTADO</p>
        <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">Unete a Nuestra Comunidad</h2>
        <p className="text-muted-foreground mb-8">
          Suscribete para recibir ofertas exclusivas, nuevos productos e ideas de regalos personalizados directamente en tu correo.
        </p>

        {isSubmitted ? (
          <div className="bg-primary/10 text-primary rounded-lg p-4">
            <p className="font-medium">Gracias por suscribirte!</p>
            <p className="text-sm mt-1">Te contactaremos pronto con ofertas exclusivas.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Ingresa tu correo electronico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-card border-border focus:border-primary"
              required
            />
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Suscribirse
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Al suscribirte, aceptas recibir comunicaciones de marketing. Puedes cancelar en cualquier momento.
        </p>
      </div>
    </section>
  )
}
