import React from "react"
import type { Metadata } from 'next'
import { Playfair_Display, Lato } from 'next/font/google'

import './globals.css'

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

const lato = Lato({ 
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
})

export const metadata: Metadata = {
  title: 'Mon Amour Studio | Marcos Personalizados Premium y Regalos',
  description: 'Descubre nuestra coleccion de marcos de fotos premium personalizados y regalos especiales. Perfectos para bodas, aniversarios y momentos especiales.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${lato.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
