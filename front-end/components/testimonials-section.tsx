"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react"
import { reviewsApi } from "@/lib/api"
import type { ResenaResponse } from "@/lib/types"

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<ResenaResponse[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    reviewsApi
      .featured(6)
      .then((data) => setReviews(data))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Don't render if no 5-star reviews
  if (loaded && reviews.length === 0) return null
  if (!loaded) return null

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
  }

  const current = reviews[currentIndex]

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
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-accent text-accent" />
              ))}
            </div>
            <p className="font-serif text-xl sm:text-2xl text-foreground leading-relaxed mb-8">
              {`"${current.comentario}"`}
            </p>
            <div>
              <p className="font-medium text-foreground">{current.usuario_nombre}</p>
            </div>
          </div>

          {/* Navigation */}
          {reviews.length > 1 && (
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
                {reviews.map((r, index) => (
                  <button
                    type="button"
                    key={r.id}
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
          )}
        </div>
      </div>
    </section>
  )
}
