import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NICHES } from '@/lib/constants/niches'
import { COUNTRIES } from '@/lib/constants/countries'

interface Props {
  params: Promise<{ storeId: string }>
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

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/stores" className="hover:text-foreground transition-colors">
          Tiendas
        </Link>
        <span>/</span>
        <span className="text-foreground">{store.name}</span>
      </div>

      {/* Store header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{store.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {country?.label ?? store.country} · {country?.languageCode ?? store.language}
          </p>
        </div>
        <Link
          href={`/onboarding?storeId=${store.id}`}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          + Producto
        </Link>
      </div>

      {/* Products */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Productos ({store.products?.length ?? 0})
        </h2>

        {!store.products || store.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">Sin productos todavía.</p>
            <Link
              href="/onboarding"
              className="mt-3 text-sm text-primary hover:underline"
            >
              Agregar primer producto →
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
                  className="flex items-center justify-between p-5 bg-card border border-border rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    {/* Color indicator */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ background: product.hex_primary ?? '#6366f1' }}
                    >
                      <span style={{ filter: 'brightness(3)' }}>{niche?.emoji ?? '📦'}</span>
                    </div>

                    <div>
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{niche?.label ?? product.niche}</span>
                        <span>·</span>
                        <span>
                          {product.target_sex === 'male' ? '♂' : product.target_sex === 'female' ? '♀' : '⊕'}{' '}
                          {product.target_age_min}–{product.target_age_max}
                        </span>
                        {product.has_reviews && (
                          <>
                            <span>·</span>
                            <span className="text-green-500">✓ reviews</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{batchCount} batch{batchCount !== 1 ? 'es' : ''}</div>
                      {lastBatch && (
                        <div className="mt-0.5">
                          <StatusBadge status={lastBatch.status} />
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/batch/new?productId=${product.id}`}
                      className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      + Batch
                    </Link>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    queued: { label: 'En cola', color: 'text-muted-foreground' },
    generating_reviews: { label: 'Generando reviews', color: 'text-yellow-500' },
    generating_concepts: { label: 'Generando conceptos', color: 'text-yellow-500' },
    generating_images: { label: 'Generando imágenes', color: 'text-blue-400' },
    done: { label: 'Completo', color: 'text-green-500' },
    error: { label: 'Error', color: 'text-red-500' },
  }
  const { label, color } = map[status] ?? { label: status, color: 'text-muted-foreground' }
  return <span className={color}>{label}</span>
}
