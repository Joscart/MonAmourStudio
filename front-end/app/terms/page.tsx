"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>

          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
            Terminos de Servicio
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Ultima actualizacion: {new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 text-sm leading-relaxed">
            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">1. Aceptacion de los Terminos</h2>
              <p>
                Al acceder y utilizar el sitio web de Mon Amour Studio (en adelante, &quot;el Sitio&quot;), aceptas cumplir con estos
                Terminos de Servicio. Si no estas de acuerdo con alguno de estos terminos, te rogamos no utilices nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">2. Descripcion del Servicio</h2>
              <p>
                Mon Amour Studio es una tienda en linea dedicada a la venta de marcos artesanales, regalos personalizados y
                productos decorativos premium. Ofrecemos productos hechos a mano con materiales de alta calidad.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">3. Registro de Cuenta</h2>
              <p>
                Para realizar compras, deberas crear una cuenta proporcionando informacion veraz y actualizada. Eres responsable
                de mantener la confidencialidad de tu contrasena y de todas las actividades realizadas bajo tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">4. Precios y Pagos</h2>
              <p>
                Todos los precios estan expresados en dolares estadounidenses (USD) e incluyen los impuestos aplicables segun la
                legislacion ecuatoriana vigente. Nos reservamos el derecho de modificar los precios sin previo aviso. El precio
                aplicable sera el vigente en el momento de la confirmacion del pedido.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">5. Envios y Entregas</h2>
              <p>
                Los tiempos de entrega son estimados y pueden variar segun la ubicacion. Mon Amour Studio no se responsabiliza
                por retrasos causados por terceros (empresas de mensajeria, aduanas, etc.). El envio gratuito aplica para pedidos
                que superen el umbral indicado en cada producto.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">6. Devoluciones y Reembolsos</h2>
              <p>
                Aceptamos devoluciones dentro de los 15 dias posteriores a la recepcion del producto, siempre que este se encuentre
                en su estado original y sin uso. Los productos personalizados no son elegibles para devolucion salvo defectos de
                fabricacion.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">7. Propiedad Intelectual</h2>
              <p>
                Todo el contenido del Sitio, incluyendo textos, imagenes, logotipos, disenos y software, es propiedad de
                Mon Amour Studio o de sus licenciantes y esta protegido por las leyes de propiedad intelectual. Queda prohibida
                su reproduccion sin autorizacion previa por escrito.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">8. Limitacion de Responsabilidad</h2>
              <p>
                Mon Amour Studio no sera responsable por danos indirectos, incidentales o consecuentes derivados del uso
                o la imposibilidad de uso del Sitio o sus productos. Nuestra responsabilidad maxima se limita al monto pagado
                por el producto en cuestion.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">9. Modificaciones</h2>
              <p>
                Nos reservamos el derecho de modificar estos Terminos de Servicio en cualquier momento. Las modificaciones
                entraran en vigor desde su publicacion en el Sitio. Es tu responsabilidad revisar periodicamente estos terminos.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">10. Legislacion Aplicable</h2>
              <p>
                Estos terminos se rigen por las leyes de la Republica del Ecuador. Cualquier controversia sera resuelta
                ante los tribunales competentes de la ciudad de Quito, Ecuador.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">11. Contacto</h2>
              <p>
                Si tienes preguntas sobre estos Terminos de Servicio, puedes contactarnos en:{" "}
                <a href="mailto:info@monamourstudio.com" className="text-primary hover:text-primary/80">
                  info@monamourstudio.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
