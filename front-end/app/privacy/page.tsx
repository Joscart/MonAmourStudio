"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
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
            Politica de Privacidad
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Ultima actualizacion: {new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 text-sm leading-relaxed">
            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">1. Informacion que Recopilamos</h2>
              <p>
                En Mon Amour Studio recopilamos la siguiente informacion cuando utilizas nuestro Sitio:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                <li>Datos de registro: nombre, correo electronico y contrasena.</li>
                <li>Datos de perfil: numero de telefono y foto de perfil (opcionales).</li>
                <li>Direcciones de envio que agreges a tu cuenta.</li>
                <li>Metodos de pago: tipo de tarjeta, ultimos 4 digitos, titular y fecha de expiracion.</li>
                <li>Historial de pedidos y productos favoritos.</li>
                <li>Datos de uso del sitio (cookies, direccion IP, tipo de navegador).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">2. Uso de la Informacion</h2>
              <p>Utilizamos tu informacion personal para:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                <li>Procesar y entregar tus pedidos.</li>
                <li>Gestionar tu cuenta y proporcionarte soporte al cliente.</li>
                <li>Enviarte notificaciones relacionadas con tus pedidos.</li>
                <li>Mejorar nuestros productos y la experiencia del usuario.</li>
                <li>Enviarte comunicaciones de marketing (solo con tu consentimiento).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">3. Almacenamiento y Seguridad</h2>
              <p>
                Tus datos se almacenan en servidores seguros. Las contrasenas se encriptan mediante algoritmos de hash
                seguros (bcrypt). Los datos de pago se almacenan de forma parcial (solo los ultimos 4 digitos de la tarjeta)
                y nunca guardamos el numero completo de la tarjeta.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">4. Compartir Informacion</h2>
              <p>
                No vendemos, intercambiamos ni transferimos tu informacion personal a terceros, excepto en los siguientes casos:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                <li>Empresas de logistica para la entrega de tus pedidos.</li>
                <li>Proveedores de servicios de pago para procesar transacciones.</li>
                <li>Cuando sea requerido por ley o autoridad competente.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">5. Cookies</h2>
              <p>
                Utilizamos cookies para mejorar tu experiencia de navegacion, recordar tus preferencias y analizar
                el trafico del sitio. Puedes configurar tu navegador para rechazar cookies, aunque esto podria
                afectar la funcionalidad del Sitio.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">6. Tus Derechos</h2>
              <p>
                Conforme a la legislacion ecuatoriana de proteccion de datos, tienes derecho a:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                <li>Acceder a tus datos personales.</li>
                <li>Rectificar datos inexactos o incompletos.</li>
                <li>Solicitar la eliminacion de tu cuenta y datos asociados.</li>
                <li>Oponerte al tratamiento de tus datos con fines de marketing.</li>
                <li>Solicitar la portabilidad de tus datos.</li>
              </ul>
              <p className="mt-2">
                Puedes ejercer estos derechos desde la seccion &quot;Ajustes&quot; de tu cuenta o contactandonos directamente.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">7. Retencion de Datos</h2>
              <p>
                Conservamos tus datos personales mientras mantengas una cuenta activa. Si solicitas la eliminacion de tu cuenta,
                procederemos a eliminar tus datos en un plazo maximo de 30 dias, salvo que la ley exija su conservacion
                por un periodo mayor.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">8. Menores de Edad</h2>
              <p>
                Nuestros servicios no estan dirigidos a menores de 18 anos. No recopilamos intencionalmente informacion
                de menores. Si detectamos que hemos recopilado datos de un menor, procederemos a eliminarlos.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">9. Cambios en esta Politica</h2>
              <p>
                Podemos actualizar esta Politica de Privacidad periodicamente. Te notificaremos de cambios significativos
                a traves de un aviso en el Sitio o por correo electronico. Te recomendamos revisar esta pagina regularmente.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">10. Contacto</h2>
              <p>
                Para consultas sobre esta Politica de Privacidad, contactanos en:{" "}
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
