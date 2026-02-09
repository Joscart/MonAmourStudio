"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { usersApi, ApiError } from "@/lib/api"
import type { UsuarioResponse } from "@/lib/types"

interface AuthState {
  user: UsuarioResponse | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  register: (nombre: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UsuarioResponse | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    const stored = localStorage.getItem("token")
    if (stored) {
      setToken(stored)
      usersApi
        .getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token")
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await usersApi.login({ email, password })
    localStorage.setItem("token", res.access_token)
    setToken(res.access_token)
    const me = await usersApi.getMe()
    setUser(me)
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await usersApi.googleAuth(credential)
    localStorage.setItem("token", res.access_token)
    setToken(res.access_token)
    const me = await usersApi.getMe()
    setUser(me)
  }, [])

  const register = useCallback(async (nombre: string, email: string, password: string) => {
    await usersApi.register({ nombre, email, password })
    // auto-login after register
    await login(email, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    try {
      const me = await usersApi.getMe()
      setUser(me)
    } catch {
      logout()
    }
  }, [token, logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
