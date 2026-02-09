"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, ArrowLeft, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ApiError } from "@/lib/api"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void
        }
      }
    }
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })
  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/account")
    }
  }, [authLoading, isAuthenticated, router])

  // Load Google Identity Services script and render button
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || !googleBtnRef.current) return

    const handleCredential = async (response: { credential: string }) => {
      setGoogleLoading(true)
      setError(null)
      try {
        await loginWithGoogle(response.credential)
        window.location.href = "/account"
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Error al registrarse con Google")
      } finally {
        setGoogleLoading(false)
      }
    }

    const initGoogle = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      })
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: googleBtnRef.current.offsetWidth,
          text: "signup_with",
        })
      }
    }

    if (window.google?.accounts) {
      initGoogle()
    } else {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initGoogle
      document.head.appendChild(script)
    }
  }, [loginWithGoogle])

  const passwordRequirements = [
    { label: "Minimo 8 caracteres", met: formData.password.length >= 8 },
    { label: "Al menos una mayuscula", met: /[A-Z]/.test(formData.password) },
    { label: "Al menos un numero", met: /[0-9]/.test(formData.password) },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) return
    setIsLoading(true)
    setError(null)
    try {
      await register(
        formData.firstName + " " + formData.lastName,
        formData.email,
        formData.password,
      )
      router.push("/account")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Ocurrio un error inesperado. Intenta de nuevo.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/images/frame-2.jpg"
          alt="Mon Amour Studio"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute bottom-8 left-8 right-8">
          <blockquote className="bg-card/90 backdrop-blur-sm p-6 rounded-lg">
            <p className="font-serif text-lg text-foreground italic mb-2">
              "Unete a nuestra comunidad y descubre la magia de los regalos personalizados."
            </p>
            <footer className="text-sm text-muted-foreground">— Mon Amour Studio</footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>

          {/* Logo */}
          <Link href="/" className="block mb-8">
            <Image
              src="/images/image.png"
              alt="Mon Amour Studio"
              width={150}
              height={75}
              className="h-16 w-auto"
            />
          </Link>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl text-foreground mb-2">Crear una cuenta</h1>
            <p className="text-muted-foreground">
              Completa tus datos para registrarte y comenzar a comprar
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Tu nombre"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Tu apellido"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="bg-card border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-card border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password Requirements */}
              <div className="space-y-1 mt-2">
                {passwordRequirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      req.met ? "bg-green-500 text-white" : "bg-muted"
                    }`}>
                      {req.met && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground font-normal leading-relaxed">
                Acepto los{" "}
                <Link href="/terms" className="text-primary hover:text-primary/80">
                  Terminos de Servicio
                </Link>{" "}
                y la{" "}
                <Link href="/privacy" className="text-primary hover:text-primary/80">
                  Politica de Privacidad
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading || !acceptTerms}
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O registrate con</span>
            </div>
          </div>

          {/* Social Login */}
          <div>
            {googleLoading && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Verificando con Google...</span>
              </div>
            )}
            <div ref={googleBtnRef} className="w-full flex justify-center" />
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
