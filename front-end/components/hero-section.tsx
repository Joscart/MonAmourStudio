"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useStoreConfig } from "@/contexts/store-config-context"

export function HeroSection() {
  const { config } = useStoreConfig()

  return (
    <section className="relative min-h-screen flex items-center pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={config.home_image_url || "/images/hero-frames.jpg"}
          alt="Coleccion de marcos personalizados premium"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-xl">
          <p className="text-accent font-medium tracking-widest text-sm mb-4">REGALOS PERSONALIZADOS PREMIUM</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight text-balance mb-6">
            Conserva Tus Momentos Mas Preciados
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Marcos premium hechos a mano, disenados para celebrar tus recuerdos mas preciados. 
            Perfectos para bodas, aniversarios y cada momento especial que merece ser enmarcado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/products">
                Ver Coleccion
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-xs tracking-widest">DESCUBRE</span>
        <div className="w-px h-12 bg-border animate-pulse" />
      </div>
    </section>
  )
}
