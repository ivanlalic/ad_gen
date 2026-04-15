'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBatch } from '@/lib/actions/batches'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { TEMPLATES, distributeTemplates } from '@/lib/constants/templates'
import { getNicheConfig } from '@/lib/constants/niches'
import { getCountryConfig } from '@/lib/constants/countries'

// Cost estimates per concept
const COST_PER_CONCEPT_CLAUDE = 0.005 // ~$0.05-0.15 per 20 concepts
const COST_PER_IMAGE_NB2 = 0.025 // ~$0.40-0.80 per 20 images

interface ProductData {
  id: string
  name: string
  niche: string
  target_sex: string
  target_age_min: number
  target_age_max: number
  hex_primary: string
  hex_secondary: string
  tone_adjectives: string[]
  words_avoid: string[]
  claims_allowed: string[]
  claims_forbidden: string[]
  has_reviews: boolean
  stores: {
    id: string
    name: string
    country: string
    language: string
  }
  product_inputs: Array<{
    type: string
    content_text: string | null
    file_url: string | null
    source: string | null
    is_simulated: boolean
  }>
}

interface BatchStudioProps {
  product: ProductData
}

const QUANTITY_OPTIONS = [
  { value: 10, label: '10', time: '~1 min', cost: '$0.30' },
  { value: 20, label: '20', time: '~2 min', cost: '$0.60', recommended: true },
  { value: 30, label: '30', time: '~3 min', cost: '$0.90' },
  { value: 50, label: '50', time: '~5 min', cost: '$1.50' },
]

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', desc: 'Feed cuadrado' },
  { value: '4:5', label: '4:5', desc: 'Feed vertical' },
  { value: '9:16', label: '9:16', desc: 'Stories / Reels' },
]

const STYLE_PRESETS = [
  { value: 'photorealistic', label: 'Photorealistic', desc: 'Product photography, natural lighting' },
  { value: 'clean-graphic', label: 'Clean Graphic', desc: 'Flat design, bold typography' },
  { value: 'lifestyle', label: 'Lifestyle', desc: 'Aspirational, natural light' },
  { value: 'ugc', label: 'UGC Style', desc: 'Raw, mobile camera feel' },
  { value: 'dark-premium', label: 'Dark Premium', desc: 'Dark luxury, dramatic lighting' },
]

const NB2_MODELS = [
  { value: 'gemini-3.1-flash-image-preview', label: 'Flash', desc: 'Rápido, alto volumen' },
  { value: 'gemini-3-pro-image-preview', label: 'Pro', desc: 'Mejor texto en imagen' },
]

export function BatchStudio({ product }: BatchStudioProps) {
  const router = useRouter()
  const niche = getNicheConfig(product.niche)
  const country = getCountryConfig(product.stores.country)

  // Form state
  const [totalConcepts, setTotalConcepts] = useState(20)
  const [keyOffers, setKeyOffers] = useState('')
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>(TEMPLATES.map(t => t.number))
  const [aspectRatios, setAspectRatios] = useState<string[]>(['1:1'])
  const [adaptFormats, setAdaptFormats] = useState(false)
  const [nb2Model, setNb2Model] = useState('gemini-3.1-flash-image-preview')
  const [stylePreset, setStylePreset] = useState('photorealistic')
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, low quality, distorted faces, wrong text, watermark, generic stock photo, plastic look'
  )
  const [seed, setSeed] = useState<string>('')
  const [pinnedConceptText, setPinnedConceptText] = useState('')
  const [generateImages, setGenerateImages] = useState(true)

  const [launching, setLaunching] = useState(false)

  // Computed
  const totalImages = totalConcepts * aspectRatios.length * (adaptFormats && aspectRatios.includes('1:1') && aspectRatios.includes('9:16') ? 1.5 : 1)
  const estimatedCost = (
    totalConcepts * COST_PER_CONCEPT_CLAUDE +
    Math.ceil(totalImages) * COST_PER_IMAGE_NB2
  ).toFixed(2)

  const winningAdsCount = product.product_inputs.filter(i => i.type === 'winning_ad').length
  const productPhotosCount = product.product_inputs.filter(i => i.type === 'product_photo').length
  const reviewsCount = product.product_inputs.filter(i => i.type === 'review').length

  function toggleTemplate(num: number) {
    setSelectedTemplates((prev: number[]) =>
      prev.includes(num)
        ? prev.length > 1 ? prev.filter((n: number) => n !== num) : prev
        : [...prev, num].sort((a, b) => a - b)
    )
  }

  function toggleAspectRatio(value: string) {
    setAspectRatios((prev: string[]) =>
      prev.includes(value)
        ? prev.filter((v: string) => v !== value)
        : [...prev, value]
    )
  }

  async function handleLaunch() {
    if (aspectRatios.length === 0) {
      gooeyToast.error('Seleccioná al menos un formato')
      return
    }

    setLaunching(true)
    const toastId = gooeyToast('Creando batch...', {
      duration: Infinity,
    })

    try {
      const batchId = await createBatch({
        productId: product.id,
        totalConcepts,
        aspectRatios,
        adaptFormats,
        nb2Model,
        stylePreset,
        negativePrompt: negativePrompt || undefined,
        seed: seed ? parseInt(seed, 10) : undefined,
        generateImages,
        pinnedConceptText: pinnedConceptText || undefined,
        keyOffers: keyOffers.trim() || undefined,
        selectedTemplates: selectedTemplates.length < TEMPLATES.length ? selectedTemplates : undefined,
      })

      gooeyToast.update(toastId, {
        title: '✓ Batch creado',
        description: 'Abriendo batch...',
        type: 'success',
      })

      // Navigate immediately — batch page handles concept generation
      router.push(`/batch/${batchId}`)
    } catch (err) {
      gooeyToast.update(toastId, {
        title: 'Error',
        description: err instanceof Error ? err.message : 'Intentá de nuevo',
        type: 'error',
      })
      setLaunching(false)
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/stores" className="hover:text-foreground transition-colors">
          Tiendas
        </Link>
        <span>/</span>
        <Link href={`/stores/${product.stores.id}`} className="hover:text-foreground transition-colors">
          {product.stores.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Nuevo batch</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Batch Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá y lanzá un batch de ads para <span className="text-foreground font-medium">{product.name}</span>
        </p>
      </div>

      {/* Product summary */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl mb-8">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: product.hex_primary ?? '#6366f1' }}
        >
          <span style={{ filter: 'brightness(3)' }}>{niche?.emoji ?? '📦'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground">{product.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {niche?.label ?? product.niche} · {country?.label ?? product.stores.country} · {product.stores.language}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {winningAdsCount > 0 && <span>{winningAdsCount} winning ads</span>}
          {productPhotosCount > 0 && <span>{productPhotosCount} fotos</span>}
          {reviewsCount > 0 && <span>{reviewsCount} reviews</span>}
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Cantidad */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            1. Cantidad de conceptos
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {QUANTITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTotalConcepts(opt.value)}
                className={[
                  'relative flex flex-col items-center gap-1 p-4 rounded-xl border text-center transition-colors duration-150',
                  totalConcepts === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                {opt.recommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
                    Recomendado
                  </span>
                )}
                <span className="text-2xl font-semibold text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{opt.time}</span>
                <span className="text-[11px] text-muted-foreground">{opt.cost}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Ofertas y mensajes clave */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            2. Ofertas y mensajes clave
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Claude los incluirá en el copy donde sea relevante. Ej: "Envío gratis", "Paga al recibir", "Oferta 4x1".
          </p>
          <textarea
            value={keyOffers}
            onChange={e => setKeyOffers(e.target.value)}
            placeholder={"Envío gratis\nPaga al recibir\nOferta 4x1 este mes"}
            rows={3}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </section>

        {/* 3. Tipos de anuncio */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            3. Tipos de anuncio
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Seleccioná qué tipos de ads generar. {selectedTemplates.length}/{TEMPLATES.length} activos.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => {
              const active = selectedTemplates.includes(t.number)
              return (
                <button
                  key={t.number}
                  onClick={() => toggleTemplate(t.number)}
                  title={t.description}
                  className={[
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors duration-150',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                  ].join(' ')}
                >
                  {t.number}. {t.name}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setSelectedTemplates(TEMPLATES.map(t => t.number))}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Seleccionar todos
            </button>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={() => setSelectedTemplates([5])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Solo producto
            </button>
          </div>
        </section>

        {/* 4. Formatos */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            4. Formatos
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {ASPECT_RATIOS.map(ratio => (
              <button
                key={ratio.value}
                onClick={() => toggleAspectRatio(ratio.value)}
                className={[
                  'flex flex-col items-center gap-1 p-4 rounded-xl border transition-colors duration-150',
                  aspectRatios.includes(ratio.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                <span className="text-lg font-semibold text-foreground">{ratio.label}</span>
                <span className="text-[11px] text-muted-foreground">{ratio.desc}</span>
              </button>
            ))}
          </div>

          {/* Adapt formats toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border cursor-pointer">
            <div
              onClick={() => setAdaptFormats(!adaptFormats)}
              className={[
                'w-10 h-6 rounded-full transition-colors duration-150 relative',
                adaptFormats ? 'bg-primary' : 'bg-muted-foreground/30',
              ].join(' ')}
            >
              <div
                className={[
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-150',
                  adaptFormats ? 'translate-x-4' : 'translate-x-0.5',
                ].join(' ')}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">Adaptar formatos</span>
              <span className="text-xs text-muted-foreground ml-2">
                Readapta 1:1 → 9:16 via image-to-image
              </span>
            </div>
          </label>
        </section>

        {/* 5. Modelo NB2 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            5. Modelo de imagen
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {NB2_MODELS.map(model => (
              <button
                key={model.value}
                onClick={() => setNb2Model(model.value)}
                className={[
                  'flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-colors duration-150',
                  nb2Model === model.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                <span className="text-sm font-semibold text-foreground">{model.label}</span>
                <span className="text-[11px] text-muted-foreground">{model.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 6. Style preset */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            6. Estilo visual
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STYLE_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => setStylePreset(preset.value)}
                className={[
                  'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors duration-150',
                  stylePreset === preset.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                <span className="text-sm font-medium text-foreground">{preset.label}</span>
                <span className="text-[11px] text-muted-foreground">{preset.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 7. Negative prompt + seed */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            7. Avanzado
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Negative prompt</label>
              <textarea
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Seed <span className="text-muted-foreground font-normal">(vacío = random)</span>
              </label>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                placeholder="Random"
                className="w-40 px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>
          </div>
        </section>

        {/* 8. Inspiración visual */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            8. Inspiración visual <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Concepto anclado
            </label>
            <p className="text-xs text-muted-foreground">
              Describí un concepto, feeling o estructura que querés como concepto nº1 del batch.
            </p>
            <textarea
              value={pinnedConceptText}
              onChange={e => setPinnedConceptText(e.target.value)}
              placeholder="Ej: Un ad oscuro con vibe de potencia, tipo suplemento de gym pero para mi producto de pelo..."
              rows={3}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </section>

        {/* Generate images toggle */}
        <label className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border cursor-pointer">
          <div
            onClick={() => setGenerateImages(!generateImages)}
            className={[
              'w-10 h-6 rounded-full transition-colors duration-150 relative',
              generateImages ? 'bg-primary' : 'bg-muted-foreground/30',
            ].join(' ')}
          >
            <div
              className={[
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-150',
                generateImages ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Generar imágenes</span>
            <span className="text-xs text-muted-foreground ml-2">
              {generateImages ? 'Conceptos + imágenes NB2' : 'Solo conceptos de texto'}
            </span>
          </div>
        </label>

        {/* Cost estimate */}
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Estimación</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {totalConcepts} conceptos · {aspectRatios.length} formato{aspectRatios.length !== 1 ? 's' : ''} · ~{Math.ceil(totalImages)} imágenes
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-foreground">${estimatedCost}</div>
              <div className="text-[11px] text-muted-foreground">Costo estimado</div>
            </div>
          </div>
        </div>

        {/* Launch button */}
        <button
          onClick={handleLaunch}
          disabled={launching || aspectRatios.length === 0}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {launching ? 'Lanzando...' : `Lanzar batch — ${totalConcepts} conceptos`}
        </button>
      </div>
    </div>
  )
}
