"use client"

import Image from "next/image"
import Link from "next/link"
import { Instagram, Facebook, Mail, Phone, MessageCircle, Globe } from "lucide-react"
import { useStoreConfig } from "@/contexts/store-config-context"

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
    { label: "Sobre Nosotros", href: "/monamour" },
    { label: "Nuestra Historia", href: "#" },
    { label: "Trabaja con Nosotros", href: "#" },
    { label: "Prensa", href: "#" },
  ],
}

export function Footer() {
  const { config } = useStoreConfig()

  const socialLinks = [
    { url: config.instagram_url, icon: Instagram, label: "Instagram" },
    { url: config.facebook_url, icon: Facebook, label: "Facebook" },
    { url: config.tiktok_url, icon: Globe, label: "TikTok" },
    { url: config.whatsapp_url, icon: MessageCircle, label: "WhatsApp" },
  ].filter((l) => l.url)

  const contactItems = [
    ...(config.email_contacto ? [{ href: `mailto:${config.email_contacto}`, icon: Mail, text: config.email_contacto }] : []),
    ...(config.email_soporte ? [{ href: `mailto:${config.email_soporte}`, icon: Mail, text: config.email_soporte }] : []),
    ...(config.telefono_contacto ? [{ href: `tel:${config.telefono_contacto}`, icon: Phone, text: config.telefono_contacto }] : []),
    ...(config.telefono_soporte ? [{ href: `tel:${config.telefono_soporte}`, icon: Phone, text: config.telefono_soporte }] : []),
  ]

  // Secondary color for footer background
  const sh = config.color_secondary_h
  const ss = config.color_secondary_s

  // Text color depends on footer_light_text config
  const light = config.footer_light_text !== false
  const txtBase = light ? "text-white" : "text-black"
  const txtMuted = light ? "text-white/70" : "text-black/70"
  const txtFaint = light ? "text-white/50" : "text-black/50"
  const iconBg = light ? "bg-white/10 hover:bg-white/20" : "bg-black/10 hover:bg-black/20"
  const borderColor = light ? "border-white/10" : "border-black/10"
  const logoFilter = light ? "brightness-0 invert" : "brightness-0"

  return (
    <footer
      className={txtBase}
      style={{ backgroundColor: `hsl(${sh}, ${Math.round(ss * 0.7)}%, 18%)` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand + Social + Contacts */}
          <div className="lg:col-span-2">
            <Image
              src={config.logo_url || "/images/image.png"}
              alt="Mon Amour Studio"
              width={140}
              height={70}
              className={`h-16 w-auto mb-4 ${logoFilter}`}
            />
            <p className={`${txtMuted} text-sm leading-relaxed mb-6 max-w-sm`}>
              Marcos premium hechos a mano y regalos personalizados para celebrar tus momentos
              mas preciados. Hechos con amor, entregados con cuidado.
            </p>

            {/* Social Media Buttons */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3 mb-6">
                {socialLinks.map(({ url, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center transition-colors`}
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}

            {/* Contact Info */}
            {contactItems.length > 0 && (
              <div className="space-y-2">
                {contactItems.map(({ href, icon: Icon, text }, i) => (
                  <a key={i} href={href} className={`flex items-center gap-2 text-sm ${txtMuted} hover:${txtBase} transition-colors`}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {text}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-serif text-lg mb-4">Tienda</h3>
            <ul className="space-y-3">
              {footerLinks.tienda.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={`text-sm ${txtMuted} hover:${txtBase} transition-colors`}>
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
                  <Link href={link.href} className={`text-sm ${txtMuted} hover:${txtBase} transition-colors`}>
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
                  <Link href={link.href} className={`text-sm ${txtMuted} hover:${txtBase} transition-colors`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`${borderColor} border-t mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <p className={`text-sm ${txtFaint}`}>
            © {new Date().getFullYear()} Mon Amour Studio. Todos los derechos reservados.
          </p>
          <div className={`flex gap-6 text-sm ${txtFaint}`}>
            <Link href="/privacy" className={`hover:${txtBase} transition-colors`}>Politica de Privacidad</Link>
            <Link href="/terms" className={`hover:${txtBase} transition-colors`}>Terminos de Servicio</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
