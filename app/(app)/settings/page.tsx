'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { User, Mail, Shield, LogOut } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'

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
      <PageHeader title="Ajustes" description="Configuración de tu cuenta" />

      {/* Account card */}
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cuenta</p>
          <Card>
            {/* Profile row */}
            <CardContent className="flex items-center gap-4 py-3 border-b border-border">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
                {avatarLetter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{user.email}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Miembro desde {createdAt}</div>
              </div>
            </CardContent>

            {/* Info rows */}
            <CardContent className="py-0 divide-y divide-border">
              <div className="flex items-center gap-3 py-4">
                <Mail size={14} className="text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                  <div className="text-sm text-foreground">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-4">
                <User size={14} className="text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Proveedor de acceso</div>
                  <div className="text-sm text-foreground capitalize">{provider}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 py-4">
                <Shield size={14} className="text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Plan</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">Free</span>
                    <Badge variant="default" className="text-[10px] h-auto py-0.5">
                      Activo
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Session section */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sesión</p>
          <Card>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium text-foreground">Cerrar sesión</div>
                <div className="text-xs text-muted-foreground mt-0.5">Salís de tu cuenta en este dispositivo</div>
              </div>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut size={13} />
                  Salir
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
