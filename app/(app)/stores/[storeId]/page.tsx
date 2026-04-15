import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Plus, Layers, CheckCircle, Clock, AlertCircle, Loader2, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NICHES } from '@/lib/constants/niches'
import { COUNTRIES } from '@/lib/constants/countries'
import { GenerateReviewsButton } from '@/components/reviews/generate-reviews-button'

interface Props {
  params: Promise<{ storeId: string }>
}

const COUNTRY_FLAG: Record<string, string> = {
  ES: '🇪🇸', AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴',
  US: '🇺🇸', BR: '🇧🇷', CL: '🇨🇱', PE: '🇵🇪',
}

export default async function StorePage({ params }: Props) {
  const { storeId } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select(`
      id, name, country, language, created_at,
      products (
        id, name, niche, target_sex, target_age_min, target_age_max,
        hex_primary, hex_secondary, has_reviews, created_at,
        batches (id, status, total_concepts, created_at)
      )
    `)
    .eq('id', storeId)
    .single()

  if (!store) notFound()

  const country = COUNTRIES.find((c) => c.code === store.country)
  const flag = COUNTRY_FLAG[store.country] ?? '🌐'

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/stores" className="hover:text-foreground transition-colors">
          Tiendas
        </Link>
        <ChevronRight size={13} className="opacity-40" />
        <span className="text-foreground">{store.name}</span>
      </nav>

      {/* Store header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-2xl shrink-0">
          {flag}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{store.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {country?.label ?? store.country} · {country?.languageCode ?? store.language}
          </p>
        </div>
        <Link
          href={`/onboarding?storeId=${store.id}`}
          className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <Plus size={13} />
          Producto
        </Link>
      </div>

      {/* Products */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Productos
          </h2>
          <span className="px-1.5 py-0.5 rounded-full bg-secondary border border-border text-[10px] text-muted-foreground">
            {store.products?.length ?? 0}
          </span>
        </div>

        {!store.products || store.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-card/30">
            <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-3">
              <Package size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Sin productos todavía</p>
            <p className="text-xs text-muted-foreground mb-5">Añadí tu primer producto para empezar a generar ads.</p>
            <Link
              href={`/onboarding?storeId=${store.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={13} />
              Agregar producto
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {store.products.map((product) => {
              const niche = NICHES.find((n) => n.key === product.niche)
              const batchCount = product.batches?.length ?? 0
              const lastBatch = product.batches?.[0]

              return (
                <div
                  key={product.id}
                  className="group relative flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-border/80 transition-colors"
                >
                  {/* Color + niche icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                    style={{ background: product.hex_primary ?? '#6366f1' }}
                  >
                    <span style={{ filter: 'brightness(3) saturate(0)' }}>
                      {niche?.emoji ?? '📦'}
                    </span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{product.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                            {niche?.label ?? product.niche}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {product.target_sex === 'male' ? 'Hombres' : product.target_sex === 'female' ? 'Mujeres' : 'Mixto'}
                            {' '}{product.target_age_min}–{product.target_age_max}a
                          </span>
                          {product.has_reviews ? (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                              <CheckCircle size={9} />
                              Reviews OK
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              <Clock size={9} />
                              Sin reviews
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {lastBatch && (
                          <Link
                            href={`/batch/${lastBatch.id}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground bg-secondary border border-border hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            <Layers size={11} />
                            {batchCount} batch{batchCount !== 1 ? 'es' : ''}
                            <StatusDot status={lastBatch.status} />
                          </Link>
                        )}
                        <Link
                          href={`/batch/new?productId=${product.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          <Plus size={11} />
                          Batch
                        </Link>
                      </div>
                    </div>

                    {/* Generate reviews CTA */}
                    {!product.has_reviews && (
                      <div className="mt-3">
                        <GenerateReviewsButton productId={product.id} productName={product.name} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    queued: { color: 'text-muted-foreground', icon: <Clock size={9} /> },
    generating_concepts: { color: 'text-yellow-500', icon: <Loader2 size={9} className="animate-spin" /> },
    generating_images: { color: 'text-blue-400', icon: <Loader2 size={9} className="animate-spin" /> },
    done: { color: 'text-green-400', icon: <CheckCircle size={9} /> },
    error: { color: 'text-red-400', icon: <AlertCircle size={9} /> },
  }
  const { color, icon } = map[status] ?? map['queued']
  return <span className={color}>{icon}</span>
}
