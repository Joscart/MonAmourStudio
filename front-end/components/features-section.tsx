import { Gift, Truck, Shield, Sparkles } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Calidad Artesanal",
    description: "Cada marco esta meticulosamente elaborado por artesanos expertos con materiales premium.",
  },
  {
    icon: Gift,
    title: "Listo Para Regalar",
    description: "Bellamente empaquetado en nuestra caja exclusiva, listo para dar como regalo especial.",
  },
  {
    icon: Truck,
    title: "Envio Gratis",
    description: "Envio gratuito en pedidos mayores a $100. Entregado con cuidado.",
  },
  {
    icon: Shield,
    title: "Garantia de Satisfaccion",
    description: "Garantia de devolucion de 30 dias. Tu felicidad es nuestra prioridad.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-16 lg:py-20 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
