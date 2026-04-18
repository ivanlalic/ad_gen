'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createBatch } from '@/lib/actions/batches'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { TEMPLATES, distributeTemplates } from '@/lib/constants/templates'
import { getNicheConfig } from '@/lib/constants/niches'
import { getCountryConfig } from '@/lib/constants/countries'
import { Toggle } from '@/components/ui/toggle'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'

const NEGATIVE_PROMPT_MAX = 500

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

  // Validation
  const seedError =
    seed.trim().length > 0 && !/^-?\d+$/.test(seed.trim())
      ? 'Debe ser un número entero'
      : null
  const negativePromptError =
    negativePrompt.length > NEGATIVE_PROMPT_MAX
      ? `Máximo ${NEGATIVE_PROMPT_MAX} caracteres`
      : null
  const formatsError =
    aspectRatios.length === 0 ? 'Seleccioná al menos un formato' : null
  const hasErrors = Boolean(seedError || negativePromptError || formatsError)

  // Computed
  const totalImages = totalConcepts * aspectRatios.length * (adaptFormats && aspectRatios.includes('1:1') && aspectRatios.includes('9:16') ? 1.5 : 1)
  const estimatedCost = (
    totalConcepts * COST_PER_CONCEPT_CLAUDE +
    Math.ceil(totalImages) * COST_PER_IMAGE_NB2
  ).toFixed(2)

  const winningAdsCount = product.product_inputs.filter(i => i.type === 'winning_ad').length
  const productPhotosCount = product.product_inputs.filter(i => i.type === 'product_photo').length
  const reviewsCount = product.product_inputs.filter(i => i.type === 'review').length

  function toggleAspectRatio(value: string) {
    setAspectRatios(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  async function handleLaunch() {
    if (formatsError) {
      gooeyToast.error(formatsError)
      return
    }
    if (negativePromptError || seedError) {
      gooeyToast.error('Revisá los campos marcados')
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
      })

      gooeyToast.update(toastId, {
        title: '✓ Batch creado',
        description: 'Generando conceptos con Claude...',
      })

      // Call the concepts API
      const res = await fetch('/api/generate/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          productId: product.id,
          totalConcepts,
          pinnedConceptText: pinnedConceptText || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error generando conceptos')
      }

      gooeyToast.update(toastId, {
        title: '✓ Conceptos generados',
        description: generateImages ? 'Generando imágenes con NB2...' : 'Batch completo (solo texto)',
        type: 'success',
      })

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

        {/* 2. Formatos */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            2. Formatos
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
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
            <Toggle
              checked={adaptFormats}
              onCheckedChange={setAdaptFormats}
              aria-label="Adaptar formatos"
              id="toggle-adapt-formats"
            />
            <label htmlFor="toggle-adapt-formats" className="cursor-pointer select-none">
              <span className="text-sm font-medium text-foreground">Adaptar formatos</span>
              <span className="text-xs text-muted-foreground ml-2">
                Readapta 1:1 → 9:16 via image-to-image
              </span>
            </label>
          </div>
        </section>

        {/* 3. Modelo NB2 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            3. Modelo de imagen
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

        {/* 4. Style preset */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            4. Estilo visual
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

        {/* 5. Negative prompt + seed */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            5. Avanzado
          </h2>
          <div className="space-y-4">
            <FormField
              htmlFor="negative-prompt"
              label={
                <span className="flex items-center justify-between gap-2 w-full">
                  <span>Negative prompt</span>
                  <span
                    className={[
                      'text-[11px] font-normal',
                      negativePrompt.length > NEGATIVE_PROMPT_MAX
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {negativePrompt.length} / {NEGATIVE_PROMPT_MAX}
                  </span>
                </span>
              }
              error={
                negativePrompt.length > NEGATIVE_PROMPT_MAX
                  ? `Máximo ${NEGATIVE_PROMPT_MAX} caracteres`
                  : null
              }
            >
              <textarea
                id="negative-prompt"
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                rows={2}
                aria-invalid={negativePrompt.length > NEGATIVE_PROMPT_MAX || undefined}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono text-xs aria-invalid:border-destructive aria-invalid:ring-destructive/30"
              />
            </FormField>
            <FormField
              htmlFor="seed-input"
              label={
                <span>
                  Seed{' '}
                  <span className="text-muted-foreground font-normal">(vacío = random)</span>
                </span>
              }
              error={seedError}
            >
              <Input
                id="seed-input"
                type="number"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                placeholder="Random"
                inputMode="numeric"
                className="w-40 font-mono"
              />
            </FormField>
          </div>
        </section>

        {/* 6. Inspiración visual */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            6. Inspiración visual <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
          <Toggle
            checked={generateImages}
            onCheckedChange={setGenerateImages}
            aria-label="Generar imágenes"
            id="toggle-generate-images"
          />
          <label htmlFor="toggle-generate-images" className="cursor-pointer select-none">
            <span className="text-sm font-medium text-foreground">Generar imágenes</span>
            <span className="text-xs text-muted-foreground ml-2">
              {generateImages ? 'Conceptos + imágenes NB2' : 'Solo conceptos de texto'}
            </span>
          </label>
        </div>

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
        {formatsError && (
          <p role="alert" className="text-xs text-destructive -mt-4">
            {formatsError}
          </p>
        )}
        <button
          onClick={handleLaunch}
          disabled={launching || hasErrors}
          aria-busy={launching || undefined}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {launching && <Loader2 size={14} className="animate-spin" />}
          {launching ? 'Lanzando…' : `Lanzar batch — ${totalConcepts} conceptos`}
        </button>
      </div>
    </div>
  )
}
