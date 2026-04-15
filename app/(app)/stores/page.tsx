import Link from 'next/link'
import { Store, ChevronRight, Plus, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tiendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stores?.length ?? 0} tienda{(stores?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/onboarding"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Nueva tienda
        </Link>
      </div>

      {/* Stores list */}
      {!stores || stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
            <Store size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Sin tiendas todavía</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Configurá tu primera tienda para empezar a generar ads con IA.
          </p>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Crear tienda
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => {
            const flag = COUNTRY_FLAG[store.country] ?? '🌐'
            const productCount = store.products?.length ?? 0
            return (
              <Link
                key={store.id}
                href={`/stores/${store.id}`}
                className="group flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-card/80 transition-all duration-150"
              >
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
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package size={10} />
                        {productCount} producto{productCount !== 1 ? 's' : ''}
                      </span>
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
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
