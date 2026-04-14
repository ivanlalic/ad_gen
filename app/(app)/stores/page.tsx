import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tiendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stores?.length ?? 0} tienda{stores?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/onboarding"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Nueva tienda
        </Link>
      </div>

      {/* Stores list */}
      {!stores || stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
          <div className="text-4xl mb-3">🏪</div>
          <h2 className="text-lg font-medium text-foreground mb-1">Sin tiendas todavía</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configurá tu primera tienda para empezar a generar ads.
          </p>
          <Link
            href="/onboarding"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Crear tienda
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="flex items-center justify-between p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-secondary transition-colors duration-150"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-base">
                  🏪
                </div>
                <div>
                  <div className="font-medium text-foreground">{store.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {store.country} · {store.products?.length ?? 0} producto{(store.products?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Product color chips */}
              <div className="flex items-center gap-2">
                {store.products?.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10"
                    style={{ background: p.hex_primary ?? '#6366f1' }}
                    title={p.name}
                  />
                ))}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground ml-1">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
