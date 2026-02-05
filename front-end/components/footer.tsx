import Image from "next/image"
import Link from "next/link"
import { Instagram, Facebook, Mail, Phone } from "lucide-react"

const footerLinks = {
  tienda: [
    { label: "Todos los Productos", href: "/products" },
    { label: "Marcos de Boda", href: "/products" },
    { label: "Regalos Aniversario", href: "/products" },
    { label: "Marcos Personalizados", href: "/products" },
    { label: "Sets de Regalo", href: "/products" },
  ],
  soporte: [
    { label: "Contactanos", href: "#contacto" },
    { label: "Preguntas Frecuentes", href: "#" },
    { label: "Info de Envio", href: "#" },
    { label: "Devoluciones", href: "#" },
    { label: "Rastrear Pedido", href: "#" },
  ],
  empresa: [
    { label: "Sobre Nosotros", href: "#nosotros" },
    { label: "Nuestra Historia", href: "#" },
    { label: "Trabaja con Nosotros", href: "#" },
    { label: "Prensa", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Image
              src="/images/image.png"
              alt="Mon Amour Studio"
              width={140}
              height={70}
              className="h-16 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-background/70 text-sm leading-relaxed mb-6 max-w-sm">
              Marcos premium hechos a mano y regalos personalizados para celebrar tus momentos 
              mas preciados. Hechos con amor, entregados con cuidado.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/70 hover:text-background transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-background transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="mailto:hello@monamourstudio.com" className="text-background/70 hover:text-background transition-colors" aria-label="Email">
                <Mail className="h-5 w-5" />
              </a>
              <a href="tel:+1234567890" className="text-background/70 hover:text-background transition-colors" aria-label="Phone">
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-serif text-lg mb-4">Tienda</h3>
            <ul className="space-y-3">
              {footerLinks.tienda.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/70 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-serif text-lg mb-4">Soporte</h3>
            <ul className="space-y-3">
              {footerLinks.soporte.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/70 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-serif text-lg mb-4">Empresa</h3>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/70 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/50">
            © {new Date().getFullYear()} Mon Amour Studio. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-sm text-background/50">
            <Link href="#" className="hover:text-background transition-colors">Politica de Privacidad</Link>
            <Link href="#" className="hover:text-background transition-colors">Terminos de Servicio</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
