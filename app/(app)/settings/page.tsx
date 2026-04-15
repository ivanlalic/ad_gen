'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { User, Mail, Shield, LogOut } from 'lucide-react'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarLetter = (user.email ?? 'U')[0].toUpperCase()
  const provider = user.app_metadata?.provider ?? 'email'
  const createdAt = new Date(user.created_at).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configuración de tu cuenta</p>
      </div>

      {/* Account card */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cuenta</h2>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Profile row */}
          <div className="flex items-center gap-4 p-5 border-b border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{user.email}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Miembro desde {createdAt}</div>
            </div>
          </div>

          {/* Info rows */}
          <div className="divide-y divide-border">
            <div className="flex items-center gap-3 px-5 py-4">
              <Mail size={14} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                <div className="text-sm text-foreground">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <User size={14} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-0.5">Proveedor de acceso</div>
                <div className="text-sm text-foreground capitalize">{provider}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <Shield size={14} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-0.5">Plan</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Free</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium">
                    Activo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Sesión</h2>
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Cerrar sesión</div>
              <div className="text-xs text-muted-foreground mt-0.5">Salís de tu cuenta en este dispositivo</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <LogOut size={13} />
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
