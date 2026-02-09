"use client"

import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Heart, Gift, Sparkles, Star, ArrowRight } from "lucide-react"

const values = [
  {
    icon: Heart,
    title: "Hecho con Amor",
    description:
      "Cada producto esta elaborado a mano con atencion al detalle, asegurando que cada pieza sea unica y especial.",
  },
  {
    icon: Sparkles,
    title: "Calidad Premium",
    description:
      "Utilizamos los mejores materiales disponibles para garantizar que nuestros marcos y regalos perduren en el tiempo.",
  },
  {
    icon: Gift,
    title: "Personalizacion",
    description:
      "Ofrecemos opciones de personalizacion para que cada regalo cuente la historia que deseas compartir.",
  },
  {
    icon: Star,
    title: "Experiencia Unica",
    description:
      "Desde el momento de la compra hasta la entrega, cuidamos cada detalle para que tu experiencia sea memorable.",
  },
]

export default function MonAmourPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 min-h-[70vh] flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-frames.jpg"
            alt="Mon Amour Studio"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">
              Nuestra Historia
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
              Mon Amour Studio
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Nacimos de la pasion por crear momentos inolvidables. Somos un estudio artesanal ecuatoriano
              dedicado a disenar marcos, regalos personalizados y detalles decorativos que celebran el amor
              en todas sus formas.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/products">
                  Explorar Productos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/collections">Ver Colecciones</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">
                Quienes Somos
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-6">
                Donde Cada Detalle Cuenta una Historia
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Mon Amour Studio nacio en Ecuador con una mision clara: transformar momentos ordinarios en
                  recuerdos extraordinarios. Lo que comenzo como un pequeno taller artesanal se ha convertido
                  en una marca reconocida por su calidad y atencion al detalle.
                </p>
                <p>
                  Nuestro equipo esta formado por artesanos apasionados que ponen su corazon en cada pieza.
                  Desde marcos clasicos hasta regalos personalizados, cada producto pasa por un riguroso
                  proceso de creacion que garantiza su calidad y durabilidad.
                </p>
                <p>
                  Creemos que los mejores regalos son aquellos que cuentan una historia. Por eso, ofrecemos
                  opciones de personalizacion que permiten a nuestros clientes crear piezas verdaderamente
                  unicas para sus seres queridos.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src="/images/frame-2.jpg"
                alt="Taller Mon Amour Studio"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">
              Nuestros Valores
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
              Lo Que Nos Define
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-card rounded-xl border border-border p-6 text-center hover:border-primary/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif text-lg text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-12 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">
              Crea Recuerdos Inolvidables
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Explora nuestra coleccion de marcos artesanales y regalos personalizados. Cada pieza esta
              disenada para celebrar los momentos que mas importan.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/products">Ver Catalogo Completo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent">
                <Link href="/collections">Explorar Colecciones</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
