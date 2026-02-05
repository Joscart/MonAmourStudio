import { ProductCard } from "@/components/product-card"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const products = [
  {
    id: "1",
    name: "Marco Romance Dorado",
    price: 89.00,
    image: "/images/frame-1.jpg",
    category: "Marcos Premium",
    isBestseller: true,
  },
  {
    id: "2",
    name: "Marco Flotante Oro Rosa",
    price: 125.00,
    image: "/images/frame-2.jpg",
    category: "Coleccion Bodas",
    isNew: true,
  },
  {
    id: "3",
    name: "Marco Barroco Vintage",
    price: 145.00,
    image: "/images/frame-3.jpg",
    category: "Coleccion Clasica",
  },
  {
    id: "4",
    name: "Marco Acrilico Moderno",
    price: 75.00,
    image: "/images/frame-4.jpg",
    category: "Contemporaneo",
    isNew: true,
  },
  {
    id: "5",
    name: "Marco Plata Grabado",
    price: 165.00,
    image: "/images/frame-5.jpg",
    category: "Regalos Aniversario",
    isBestseller: true,
  },
  {
    id: "6",
    name: "Marco Vidrio Doble Cara",
    price: 110.00,
    image: "/images/frame-6.jpg",
    category: "Marcos Premium",
  },
]

export function ProductsSection() {
  return (
    <section id="tienda" className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-accent font-medium tracking-widest text-sm mb-3">NUESTRA COLECCION</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground text-balance mb-4">
            Marcos Personalizados Premium
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cada marco esta elaborado con los mejores materiales y meticulosa atencion al detalle, 
            disenado para mostrar bellamente tus recuerdos mas preciados.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent">
            <Link href="/products">
              Ver Todos los Productos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
