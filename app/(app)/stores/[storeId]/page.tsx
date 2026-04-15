import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Plus, CheckCircle, Clock, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NICHES } from '@/lib/constants/niches'
import { COUNTRIES } from '@/lib/constants/countries'
import { GenerateReviewsButton } from '@/components/reviews/generate-reviews-button'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { BatchList } from '@/components/batch/batch-list'
import { cn } from '@/lib/utils'

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
      <PageHeader
        title={store.name}
        description={`${country?.label ?? store.country} · ${country?.languageCode ?? store.language}`}
      >
        <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-2xl shrink-0 order-first">
          {flag}
        </div>
        <Link
          href={`/onboarding?storeId=${store.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Plus size={13} />
          Producto
        </Link>
      </PageHeader>

      {/* Products */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Productos
          </h2>
          <Badge variant="secondary" className="text-[10px] h-auto py-0.5">
            {store.products?.length ?? 0}
          </Badge>
        </div>

        {!store.products || store.products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Sin productos todavía"
            description="Añadí tu primer producto para empezar a generar ads."
          >
            <Link
              href={`/onboarding?storeId=${store.id}`}
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              <Plus size={13} />
              Agregar producto
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-3">
            {store.products.map((product) => {
              const niche = NICHES.find((n) => n.key === product.niche)
              const batchCount = product.batches?.length ?? 0

              return (
                <Card key={product.id} className="group card-glow border-gradient">
                  <CardContent className="flex items-start gap-4 py-3">
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
                            <Badge variant="outline" className="text-[10px] h-auto py-0.5">
                              {niche?.label ?? product.niche}
                            </Badge>
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

                        {/* New batch button */}
                        <Link
                          href={`/batch/new?productId=${product.id}`}
                          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'text-xs h-7 shrink-0')}
                        >
                          <Plus size={11} />
                          Nuevo batch
                        </Link>
                      </div>

                      {/* Generate reviews CTA */}
                      {!product.has_reviews && (
                        <div className="mt-3">
                          <GenerateReviewsButton productId={product.id} productName={product.name} />
                        </div>
                      )}

                      {/* Batch list */}
                      {batchCount > 0 && (
                        <BatchList batches={product.batches ?? []} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
