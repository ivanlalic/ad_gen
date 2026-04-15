"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { gooeyToast } from "@/components/ui/goey-toaster"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      gooeyToast.error(error.message)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      gooeyToast.error(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Logo + tagline */}
      <div className="text-center space-y-2 pb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 mb-3">
          <span className="text-primary font-bold text-lg tracking-tight">A</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Ad<span className="text-primary">Gen</span>
          <span className="text-muted-foreground font-light text-base ml-1.5">2.0</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Generá anuncios que convierten con IA
        </p>
      </div>

      {/* Glass card */}
      <div
        className="rounded-2xl border border-white/[0.08] p-6 space-y-5"
        style={{
          background: 'oklch(0.13 0.006 264 / 0.85)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 0 0.5px oklch(1 0 0 / 0.06) inset, 0 24px 48px oklch(0 0 0 / 0.4)',
        }}
      >
        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/[0.10] text-sm font-medium text-foreground transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'oklch(0.18 0.006 264 / 0.8)',
            boxShadow: '0 0 0 0.5px oklch(1 0 0 / 0.05) inset',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.22 0.006 264 / 0.9)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.006 264 / 0.8)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Redirigiendo..." : "Continuar con Google"}
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.07]" />
          <span className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">o</span>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>

        {/* Email / password */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-150"
            style={{
              background: 'oklch(1 0 0 / 0.05)',
              border: '1px solid oklch(1 0 0 / 0.09)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'oklch(0.63 0.22 264 / 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px oklch(0.63 0.22 264 / 0.12)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'oklch(1 0 0 / 0.09)'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-150"
            style={{
              background: 'oklch(1 0 0 / 0.05)',
              border: '1px solid oklch(1 0 0 / 0.09)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'oklch(0.63 0.22 264 / 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px oklch(0.63 0.22 264 / 0.12)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'oklch(1 0 0 / 0.09)'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-primary-foreground transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'oklch(0.63 0.22 264)',
              boxShadow: '0 0 0 0.5px oklch(0.7 0.22 264 / 0.3) inset, 0 4px 16px oklch(0.63 0.22 264 / 0.3)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.58 0.22 264)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.63 0.22 264)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Entrando...
              </span>
            ) : "Entrar"}
          </button>
        </form>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/50">
        Al continuar, aceptás los términos de uso.
      </p>
    </div>
  )
}
