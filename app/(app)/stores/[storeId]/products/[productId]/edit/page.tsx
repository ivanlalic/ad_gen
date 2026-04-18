import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductEditForm } from '@/components/product/product-edit-form'
import { PageHeader } from '@/components/ui/page-header'

interface Props {
  params: Promise<{ storeId: string; productId: string }>
}

export default async function ProductEditPage({ params }: Props) {
  const { storeId, productId } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, niche, target_sex, target_age_min, target_age_max,
      hex_primary, hex_secondary, tone_adjectives, words_avoid,
      claims_allowed, claims_forbidden, store_id,
      description, key_features, unique_value_prop,
      target_audience_description, common_objections, use_cases,
      stores (name, country)
    `)
    .eq('id', productId)
    .eq('store_id', storeId)
    .single()

  if (!product) notFound()

  const [{ data: productPhotos }, { data: winningAds }] = await Promise.all([
    supabase
      .from('product_inputs')
      .select('id, file_url')
      .eq('product_id', productId)
      .eq('type', 'product_photo')
      .not('file_url', 'is', null),
    supabase
      .from('product_inputs')
      .select('id, file_url')
      .eq('product_id', productId)
      .eq('type', 'winning_ad')
      .not('file_url', 'is', null),
  ])

  const storeName = (product as any).stores?.name ?? 'Tienda'
  const storeCountry = (product as any).stores?.country ?? 'ES'

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/stores" className="hover:text-foreground transition-colors">Tiendas</Link>
        <ChevronRight size={13} className="opacity-40" />
        <Link href={`/stores/${storeId}`} className="hover:text-foreground transition-colors">{storeName}</Link>
        <ChevronRight size={13} className="opacity-40" />
        <span className="text-foreground">{product.name}</span>
        <ChevronRight size={13} className="opacity-40" />
        <span className="text-foreground">Editar</span>
      </nav>

      <PageHeader
        title="Editar producto"
        description={product.name}
      />

      <div className="mt-8">
        <ProductEditForm
          product={product}
          productPhotos={productPhotos ?? []}
          winningAds={winningAds ?? []}
          storeCountry={storeCountry}
        />
      </div>
    </div>
  )
}
