import Link from 'next/link'
import { Store, ChevronRight, Plus, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

const COUNTRY_FLAG: Record<string, string> = {
  ES: '🇪🇸', AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴',
  US: '🇺🇸', BR: '🇧🇷', CL: '🇨🇱', PE: '🇵🇪',
}

export default async function StoresPage() {
  const supabase = await createClient()
  const { data: stores } = await supabase
    .from('stores')
    .select(`
      id, name, country, created_at,
      products (id, name, niche, hex_primary)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <PageHeader
        title="Tiendas"
        description={`${stores?.length ?? 0} tienda${(stores?.length ?? 0) !== 1 ? 's' : ''}`}
      >
        <Link href="/onboarding" className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus size={15} />
          Nueva tienda
        </Link>
      </PageHeader>

      {!stores || stores.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Sin tiendas todavía"
          description="Configurá tu primera tienda para empezar a generar ads con IA."
        >
          <Link href="/onboarding" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus size={14} />
            Crear tienda
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => {
            const flag = COUNTRY_FLAG[store.country] ?? '🌐'
            const productCount = store.products?.length ?? 0
            return (
              <Link key={store.id} href={`/stores/${store.id}`} className="group block">
                <Card className="card-glow cursor-pointer border-gradient">
                  <CardContent className="flex items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-4">
                      {/* Store icon */}
                      <div className="w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center text-xl shrink-0 group-hover:border-primary/30 transition-colors">
                        {flag}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{store.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{store.country}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <Badge variant="secondary" className="text-[10px] h-auto py-0.5 gap-1">
                            <Package size={9} />
                            {productCount} producto{productCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                      {/* Product color dots */}
                      <div className="flex items-center gap-1">
                        {store.products?.slice(0, 4).map((p) => (
                          <div
                            key={p.id}
                            className="w-3 h-3 rounded-full ring-1 ring-black/10"
                            style={{ background: p.hex_primary ?? '#6366f1' }}
                            title={p.name}
                          />
                        ))}
                      </div>
                      <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
