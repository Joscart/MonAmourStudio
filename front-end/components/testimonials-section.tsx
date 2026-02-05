"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"

const testimonials = [
  {
    id: 1,
    text: "El marco llego bellamente empaquetado y supero todas las expectativas. Ahora guarda nuestra foto de boda y nos trae alegria todos los dias.",
    author: "Maria & Carlos",
    location: "Quito, Ecuador",
  },
  {
    id: 2,
    text: "Pedi un marco personalizado para el aniversario de mis padres y se emocionaron hasta las lagrimas. La calidad y artesania son excepcionales.",
    author: "Ana Gomez",
    location: "Guayaquil, Ecuador",
  },
  {
    id: 3,
    text: "Mon Amour Studio se ha convertido en mi opcion favorita para regalos significativos. Cada pieza se siente especial y las opciones de personalizacion son maravillosas.",
    author: "Sofia Rodriguez",
    location: "Cuenca, Ecuador",
  },
]

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-accent font-medium tracking-widest text-sm mb-3">TESTIMONIOS</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">Lo Que Dicen Nuestros Clientes</h2>
        </div>

        {/* Testimonial Card */}
        <div className="relative">
          <div className="text-center px-4 md:px-16">
            <Quote className="h-10 w-10 text-primary/30 mx-auto mb-6" />
            <p className="font-serif text-xl sm:text-2xl text-foreground leading-relaxed mb-8">
              {`"${testimonials[currentIndex].text}"`}
            </p>
            <div>
              <p className="font-medium text-foreground">{testimonials[currentIndex].author}</p>
              <p className="text-sm text-muted-foreground">{testimonials[currentIndex].location}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              type="button"
              onClick={prevTestimonial}
              className="p-2 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
              aria-label="Testimonio anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  type="button"
                  key={`testimonial-dot-${testimonials[index].id}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? "bg-primary" : "bg-border hover:bg-primary/50"
                  }`}
                  aria-label={`Ir al testimonio ${index + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={nextTestimonial}
              className="p-2 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
              aria-label="Siguiente testimonio"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
