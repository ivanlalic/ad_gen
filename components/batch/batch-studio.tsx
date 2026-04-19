'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBatch, type AngleConfig } from '@/lib/actions/batches'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { TEMPLATES, distributeTemplates } from '@/lib/constants/templates'
import { getNicheConfig } from '@/lib/constants/niches'
import { getCountryConfig } from '@/lib/constants/countries'
import { FormatSelector } from '@/components/format-selector'
import { DEFAULT_FORMAT, type AdFormat } from '@/lib/ad-formats'
import { Toggle } from '@/components/ui/toggle'
import { AiModelPicker, type AiModelValue } from '@/components/ui/ai-model-picker'

const CONCEPT_MODELS = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini Flash Lite', desc: 'Más rápido, más barato', badge: 'Recomendado' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku', desc: 'Rápido, copy sólido' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet', desc: 'Equilibrio calidad/velocidad' },
  { value: 'claude-opus-4-6', label: 'Claude Opus', desc: 'Máxima calidad, copy profundo' },
]

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
  { value: 10, label: '10' },
  { value: 20, label: '20', recommended: true },
  { value: 30, label: '30' },
  { value: 50, label: '50' },
]


const STYLE_PRESETS = [
  { value: 'auto', label: 'Auto (IA elige)', desc: 'Gemini elige el estilo según el concepto' },
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
  const [batchLabel, setBatchLabel] = useState('')
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>(TEMPLATES.map(t => t.number))
  const [primaryFormat, setPrimaryFormat] = useState<AdFormat>(DEFAULT_FORMAT)
  const [aspectRatios, setAspectRatios] = useState<string[]>([DEFAULT_FORMAT])
  const [nb2Model, setNb2Model] = useState('gemini-3.1-flash-image-preview')
  const [conceptModel, setConceptModel] = useState('gemini-3.1-flash-lite-preview')
  const [stylePreset, setStylePreset] = useState('auto')
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, low quality, distorted faces, wrong text, watermark, generic stock photo, plastic look'
  )
  const [seed, setSeed] = useState<string>('')
  const [pinnedConceptText, setPinnedConceptText] = useState('')
  const [generateImages, setGenerateImages] = useState(true)

  // Angles mode
  const [generationMode, setGenerationMode] = useState<'templates' | 'angles' | 'winning_ads'>('templates')
  const [numAngles, setNumAngles] = useState(3)
  const [generatedAngles, setGeneratedAngles] = useState<Array<AngleConfig & { selected: boolean }>>([])
  const [anglesLoading, setAnglesLoading] = useState(false)
  const [anglesModel, setAnglesModel] = useState<AiModelValue>('claude-haiku-4-5-20251001')
  const [manualAngleInput, setManualAngleInput] = useState('')
  const [improvingAngle, setImprovingAngle] = useState(false)
  const [improvedAnglePreview, setImprovedAnglePreview] = useState<{ title: string; type: string; description: string } | null>(null)
  // Winning ads mode
  const [winningAngles, setWinningAngles] = useState<Array<AngleConfig & { selected: boolean }>>([])
  const [winningAnglesLoading, setWinningAnglesLoading] = useState(false)
  const [winningAnglesModel, setWinningAnglesModel] = useState<AiModelValue>('claude-haiku-4-5-20251001')

  const [launching, setLaunching] = useState(false)

  // Computed
  const totalImages = totalConcepts * aspectRatios.length

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

async function handleGenerateAngles() {
    setAnglesLoading(true)
    try {
      const res = await fetch('/api/generate/angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, numAngles, keyOffers: keyOffers || undefined, model: anglesModel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error generando ángulos')
      setGeneratedAngles(data.angles.map((a: AngleConfig) => ({ ...a, selected: true })))
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error generando ángulos')
    } finally {
      setAnglesLoading(false)
    }
  }

  function toggleAngle(id: number) {
    setGeneratedAngles(prev => {
      const selected = prev.filter(a => a.selected)
      const target = prev.find(a => a.id === id)
      // Prevent deselecting last angle
      if (target?.selected && selected.length <= 1) return prev
      return prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    })
  }

  async function handleImproveAngle() {
    if (!manualAngleInput.trim() || improvingAngle) return
    setImprovingAngle(true)
    setImprovedAnglePreview(null)
    try {
      const res = await fetch('/api/generate/improve-angle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: manualAngleInput, productName: product.name, niche: product.niche }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error mejorando ángulo')
      setImprovedAnglePreview(data.angle)
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error mejorando ángulo')
    } finally {
      setImprovingAngle(false)
    }
  }

  function handleAddManualAngle(angle: { title: string; type: string; description: string }) {
    const nextId = Math.max(0, ...generatedAngles.map(a => a.id)) + 1
    setGeneratedAngles(prev => [...prev, { id: nextId, title: angle.title, description: angle.description, selected: true }])
    setManualAngleInput('')
    setImprovedAnglePreview(null)
  }

  async function handleGenerateWinningAdAngles() {
    setWinningAnglesLoading(true)
    try {
      const res = await fetch('/api/generate/winning-ad-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, model: winningAnglesModel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error analizando winning ads')
      setWinningAngles(data.angles.map((a: AngleConfig) => ({ ...a, selected: true })))
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error analizando winning ads')
    } finally {
      setWinningAnglesLoading(false)
    }
  }

  async function handleLaunch() {
    if (!primaryFormat) {
      gooeyToast.error('Seleccioná un formato')
      return
    }

    if (generationMode === 'angles' && generatedAngles.filter(a => a.selected).length === 0) {
      gooeyToast.error('Generá y seleccioná al menos un ángulo')
      return
    }

    if (generationMode === 'winning_ads' && winningAngles.filter(a => a.selected).length === 0) {
      gooeyToast.error('Analizá y seleccioná al menos un ángulo ganador')
      return
    }

    setLaunching(true)
    const toastId = gooeyToast('Creando batch...', {
      duration: Infinity,
    })

    const selectedAngles = generationMode === 'winning_ads'
      ? winningAngles.filter(a => a.selected).map(({ selected: _, ...a }) => a)
      : generatedAngles.filter(a => a.selected).map(({ selected: _, ...a }) => a)

    try {
      const batchId = await createBatch({
        productId: product.id,
        totalConcepts,
        aspectRatios,
        adaptFormats: false,
        nb2Model,
        conceptModel,
        stylePreset,
        negativePrompt: negativePrompt || undefined,
        seed: seed ? parseInt(seed, 10) : undefined,
        generateImages,
        pinnedConceptText: generationMode === 'templates' ? (pinnedConceptText || undefined) : undefined,
        keyOffers: keyOffers.trim() || undefined,
        label: batchLabel.trim() || undefined,
        selectedTemplates: generationMode === 'templates' && selectedTemplates.length < TEMPLATES.length ? selectedTemplates : undefined,
        generationMode,
        angleConfigs: (generationMode === 'angles' || generationMode === 'winning_ads') ? selectedAngles : undefined,
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
              </button>
            ))}
          </div>
        </section>

        {/* 2. Label del batch */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            2. Label del batch <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Identifica el ángulo o campaña. Se usa en el nombre de los archivos descargados.
          </p>
          <input
            type="text"
            value={batchLabel}
            onChange={e => setBatchLabel(e.target.value)}
            placeholder="ej: manchas, arrugas, promo-verano"
            maxLength={30}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </section>

        {/* Ofertas y mensajes clave */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            3. Ofertas y mensajes clave
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

        {/* 3. Dirección creativa */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            3. Dirección creativa
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-0 rounded-lg border border-border overflow-hidden w-fit text-sm mb-4">
            {([
              { value: 'templates', label: 'Templates' },
              { value: 'angles', label: 'Ángulos IA' },
              { value: 'winning_ads', label: '🏆 Ganadores' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setGenerationMode(value)}
                className={[
                  'px-5 py-2 transition-colors duration-150',
                  generationMode === value
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {generationMode === 'winning_ads' ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                La IA analiza tus winning ads reales y extrae los ángulos de messaging que los hacen funcionar. Los conceptos del batch serán variaciones y evoluciones de esos ángulos.
              </p>

              {winningAdsCount === 0 ? (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-400">
                  No hay winning ads subidos para este producto. Subílos desde <span className="font-medium">"Editar producto"</span> para usar este modo.
                </div>
              ) : (
                <>
                  {/* Thumbnails */}
                  <div className="flex flex-wrap gap-2">
                    {product.product_inputs
                      .filter(i => i.type === 'winning_ad' && i.file_url)
                      .map((ad, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={ad.file_url!}
                          alt={`Winning ad ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-border"
                        />
                      ))}
                    <div className="flex items-center pl-1 text-xs text-muted-foreground">
                      {winningAdsCount} ad{winningAdsCount !== 1 ? 's' : ''} ganador{winningAdsCount !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  {winningAngles.length === 0 ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleGenerateWinningAdAngles}
                        disabled={winningAnglesLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {winningAnglesLoading ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                            Analizando {winningAdsCount} ad{winningAdsCount !== 1 ? 's' : ''}...
                          </>
                        ) : `🏆 Analizar ${winningAdsCount} ad${winningAdsCount !== 1 ? 's' : ''} ganador${winningAdsCount !== 1 ? 'es' : ''}`}
                      </button>
                      <AiModelPicker value={winningAnglesModel} onChange={setWinningAnglesModel} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const selectedCount = winningAngles.filter(a => a.selected).length
                        const perAngle = selectedCount > 0 ? Math.floor(totalConcepts / selectedCount) : 0
                        const remainder = selectedCount > 0 ? totalConcepts % selectedCount : 0
                        return (
                          <p className="text-xs text-muted-foreground">
                            {selectedCount} ángulo{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''} · {totalConcepts} conceptos → {perAngle}{remainder > 0 ? `-${perAngle + 1}` : ''} por ángulo
                          </p>
                        )
                      })()}

                      <div className="space-y-2">
                        {winningAngles.map((angle, idx) => (
                          <div
                            key={angle.id}
                            className={[
                              'p-3.5 rounded-xl border transition-colors duration-150',
                              angle.selected
                                ? 'border-amber-500/30 bg-amber-500/5'
                                : 'border-border bg-card opacity-50',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-medium text-amber-400/70 uppercase tracking-wider">
                                    🏆 Ad {idx + 1}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-foreground leading-snug">{angle.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{angle.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setWinningAngles(prev => {
                                    const selected = prev.filter(a => a.selected)
                                    const target = prev.find(a => a.id === angle.id)
                                    if (target?.selected && selected.length <= 1) return prev
                                    return prev.map(a => a.id === angle.id ? { ...a, selected: !a.selected } : a)
                                  })
                                }}
                                className={[
                                  'shrink-0 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors duration-150 mt-0.5',
                                  angle.selected
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                                ].join(' ')}
                              >
                                {angle.selected ? '✓' : '+'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => { setWinningAngles([]); handleGenerateWinningAdAngles() }}
                        disabled={winningAnglesLoading}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        Reanalizar
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : generationMode === 'templates' ? (
            <>
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
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                La IA genera ángulos creativos únicos — cada ángulo es una dirección de messaging diferente. Elegís cuáles usar y los conceptos se distribuyen entre ellos.
              </p>

              {/* Num angles selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Número de ángulos</label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 7, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setNumAngles(n); setGeneratedAngles([]) }}
                      className={[
                        'w-10 h-10 rounded-lg border text-sm font-medium transition-colors duration-150 shrink-0',
                        numAngles === n
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                      ].join(' ')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate angles button or angle cards */}
              {generatedAngles.length === 0 ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGenerateAngles}
                    disabled={anglesLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {anglesLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                        Generando {numAngles} ángulos...
                      </>
                    ) : `✨ Generar ${numAngles} ángulos`}
                  </button>
                  <AiModelPicker value={anglesModel} onChange={setAnglesModel} />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Distribution math */}
                  {(() => {
                    const selectedCount = generatedAngles.filter(a => a.selected).length
                    const perAngle = selectedCount > 0 ? Math.floor(totalConcepts / selectedCount) : 0
                    const remainder = selectedCount > 0 ? totalConcepts % selectedCount : 0
                    return (
                      <p className="text-xs text-muted-foreground">
                        {selectedCount} ángulo{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''} · {totalConcepts} conceptos → {perAngle}{remainder > 0 ? `-${perAngle + 1}` : ''} por ángulo
                      </p>
                    )
                  })()}

                  {/* Angle cards */}
                  <div className="space-y-2">
                    {generatedAngles.map(angle => (
                      <div
                        key={angle.id}
                        className={[
                          'p-3.5 rounded-xl border transition-colors duration-150',
                          angle.selected
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-card opacity-50',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                Ángulo {angle.id}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground leading-snug">{angle.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{angle.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAngle(angle.id)}
                            className={[
                              'shrink-0 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors duration-150 mt-0.5',
                              angle.selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground',
                            ].join(' ')}
                          >
                            {angle.selected ? '✓' : '+'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setGeneratedAngles([]); setImprovedAnglePreview(null); handleGenerateAngles() }}
                    disabled={anglesLoading}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Regenerar ángulos
                  </button>

                  {/* Manual angle add */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">+ Agregar ángulo propio</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualAngleInput}
                        onChange={e => { setManualAngleInput(e.target.value); setImprovedAnglePreview(null) }}
                        placeholder="Ej: manchas sol cuarenta"
                        onKeyDown={e => e.key === 'Enter' && handleImproveAngle()}
                        className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={handleImproveAngle}
                        disabled={!manualAngleInput.trim() || improvingAngle}
                        className="px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {improvingAngle ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin inline-block" />
                            Mejorando...
                          </span>
                        ) : '✨ Mejorar'}
                      </button>
                    </div>

                    {improvedAnglePreview && (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{improvedAnglePreview.title}</p>
                          <span className={[
                            'shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider',
                            improvedAnglePreview.type === 'pain' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400',
                          ].join(' ')}>
                            {improvedAnglePreview.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{improvedAnglePreview.description}</p>
                        <button
                          type="button"
                          onClick={() => handleAddManualAngle(improvedAnglePreview)}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          + Agregar a la lista
                        </button>
                      </div>
                    )}

                    {/* Quick add without improving */}
                    {manualAngleInput.trim() && !improvedAnglePreview && !improvingAngle && (
                      <button
                        type="button"
                        onClick={() => handleAddManualAngle({ title: manualAngleInput.trim(), type: 'pain', description: '' })}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Agregar sin mejorar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 4. Formato */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            4. Formato principal
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Determina el ratio de las imágenes y las safe zones en el prompt de generación.
          </p>
          <FormatSelector
            value={primaryFormat}
            onChange={(fmt) => {
              setPrimaryFormat(fmt)
              setAspectRatios([fmt])
            }}
          />
        </section>

        {/* 5. Modelo de conceptos */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            5. Modelo de conceptos
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Modelo que genera los copies y conceptos.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONCEPT_MODELS.map(model => (
              <button
                key={model.value}
                onClick={() => setConceptModel(model.value)}
                className={[
                  'relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors duration-150',
                  conceptModel === model.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                {model.badge && conceptModel === model.value && (
                  <span className="absolute -top-2 right-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-medium rounded-full">
                    {model.badge}
                  </span>
                )}
                <span className="text-xs font-semibold text-foreground">{model.label}</span>
                <span className="text-[10px] text-muted-foreground">{model.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 6. Modelo NB2 */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            6. Modelo de imagen
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
            7. Estilo visual
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
            8. Avanzado
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

            {/* Generate images toggle */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary border border-border">
              <Toggle
                checked={generateImages}
                onCheckedChange={setGenerateImages}
                aria-label="Generar imágenes al lanzar"
                id="generate-images-toggle"
                className="mt-0.5"
              />
              <label htmlFor="generate-images-toggle" className="cursor-pointer flex-1">
                <span className="text-sm font-medium text-foreground">Generar imágenes</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {generateImages
                    ? 'ON — genera copies + imágenes al lanzar'
                    : 'OFF — genera solo copies de texto. Podés generar imágenes concepto por concepto desde el batch.'}
                </p>
              </label>
            </div>
          </div>
        </section>

        {/* 8. Inspiración visual — only in templates mode */}
        {generationMode === 'templates' && <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            9. Ángulo de partida <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Ángulo de partida
            </label>
            <p className="text-xs text-muted-foreground">
              Describe un ángulo, feeling o referencia para el primer concepto. Útil para testear un enfoque específico: vibe, estructura de hook, tipo de audiencia. El resto del batch complementa este ángulo.
            </p>
            <textarea
              value={pinnedConceptText}
              onChange={e => setPinnedConceptText(e.target.value)}
              placeholder="Ej: Un ad oscuro con vibe de potencia, tipo suplemento de gym pero para mi producto de pelo..."
              rows={3}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </section>}



        {/* Launch button */}
        {(generationMode === 'templates' || generatedAngles.length > 0 || winningAngles.length > 0) && (
          <button
            onClick={handleLaunch}
            disabled={
              launching ||
              (generationMode === 'angles' && generatedAngles.filter(a => a.selected).length === 0) ||
              (generationMode === 'winning_ads' && (winningAdsCount === 0 || winningAngles.filter(a => a.selected).length === 0))
            }
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {launching ? 'Lanzando...' : `Lanzar batch — ${totalConcepts} conceptos`}
          </button>
        )}
      </div>
    </div>
  )
}
