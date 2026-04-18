'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Upload, ImageIcon, Plus, X, Trophy } from 'lucide-react'
import { updateProduct, saveProductInput, deleteProductInput, deleteProduct } from '@/lib/actions/products'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { createClient } from '@/lib/supabase/client'
import { NICHES } from '@/lib/constants/niches'

interface ProductPhoto {
  id: string
  file_url: string | null
}

interface WinningAd {
  id: string
  file_url: string | null
}

interface ProductEditFormProps {
  storeCountry?: string
  product: {
    id: string
    name: string
    niche: string | null
    target_sex: string | null
    target_age_min: number | null
    target_age_max: number | null
    hex_primary: string | null
    hex_secondary: string | null
    tone_adjectives: string[] | null
    words_avoid: string[] | null
    claims_allowed: string[] | null
    claims_forbidden: string[] | null
    store_id: string
    description: string | null
    key_features: string | null
    unique_value_prop: string | null
    target_audience_description: string | null
    common_objections: string | null
    use_cases: string | null
  }
  productPhotos: ProductPhoto[]
  winningAds?: WinningAd[]
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = e.currentTarget.value.trim()
      if (val && !value.includes(val)) {
        onChange([...value, val])
        e.currentTarget.value = ''
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-input border border-border rounded-lg min-h-[42px]">
      {value.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-full text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : '+ agregar'}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
    </div>
  )
}

export function ProductEditForm({ product, productPhotos: initialPhotos, winningAds: initialWinningAds = [], storeCountry = 'ES' }: ProductEditFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const winningAdInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingWinningAd, setUploadingWinningAd] = useState(false)
  const [photos, setPhotos] = useState<ProductPhoto[]>(initialPhotos)
  const [winningAds, setWinningAds] = useState<WinningAd[]>(initialWinningAds)
  const [analyzeUrls, setAnalyzeUrls] = useState<string[]>([''])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [name, setName] = useState(product.name)
  const [niche, setNiche] = useState(product.niche ?? '')
  const [targetSex, setTargetSex] = useState<'male' | 'female' | 'unisex'>(
    (product.target_sex as 'male' | 'female' | 'unisex') ?? 'unisex'
  )
  const [ageMin, setAgeMin] = useState(product.target_age_min ?? 25)
  const [ageMax, setAgeMax] = useState(product.target_age_max ?? 55)
  const [hexPrimary, setHexPrimary] = useState(product.hex_primary ?? '#6366f1')
  const [hexSecondary, setHexSecondary] = useState(product.hex_secondary ?? '#1a1a24')
  const [toneAdjectives, setToneAdjectives] = useState<string[]>(product.tone_adjectives ?? [])
  const [wordsAvoid, setWordsAvoid] = useState<string[]>(product.words_avoid ?? [])
  const [claimsAllowed, setClaimsAllowed] = useState<string[]>(product.claims_allowed ?? [])
  const [claimsForbidden, setClaimsForbidden] = useState<string[]>(product.claims_forbidden ?? [])
  const [description, setDescription] = useState(product.description ?? '')
  const [keyFeatures, setKeyFeatures] = useState(product.key_features ?? '')
  const [uniqueValueProp, setUniqueValueProp] = useState(product.unique_value_prop ?? '')
  const [targetAudienceDescription, setTargetAudienceDescription] = useState(product.target_audience_description ?? '')
  const [commonObjections, setCommonObjections] = useState(product.common_objections ?? '')
  const [useCases, setUseCases] = useState(product.use_cases ?? '')

  async function handleAnalyzeUrl() {
    const urls = analyzeUrls.map((u) => u.trim()).filter((u) => u.startsWith('http'))
    if (urls.length === 0) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, country: storeCountry }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al analizar la URL')

      if (data.name) setName(data.name)
      if (data.niche) setNiche(data.niche)
      if (data.description) setDescription(data.description)
      if (data.keyFeatures) setKeyFeatures(data.keyFeatures)
      if (data.uniqueValueProp) setUniqueValueProp(data.uniqueValueProp)
      if (data.targetAudienceDescription) setTargetAudienceDescription(data.targetAudienceDescription)
      if (data.commonObjections) setCommonObjections(data.commonObjections)
      if (data.useCases) setUseCases(data.useCases)
      if (data.hexPrimary) setHexPrimary(data.hexPrimary)
      if (data.hexSecondary) setHexSecondary(data.hexSecondary)
      if (data.toneAdjectives?.length) setToneAdjectives(data.toneAdjectives)
      if (data.targetSex) setTargetSex(data.targetSex)
      if (data.targetAgeMin) setAgeMin(data.targetAgeMin)
      if (data.targetAgeMax) setAgeMax(data.targetAgeMax)

      gooeyToast.success('Campos actualizados — revisá antes de guardar')
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Error al analizar la URL')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateProduct({
        productId: product.id,
        name: name.trim(),
        niche,
        targetSex,
        targetAgeMin: ageMin,
        targetAgeMax: ageMax,
        hexPrimary,
        hexSecondary,
        toneAdjectives,
        wordsAvoid,
        claimsAllowed,
        claimsForbidden,
        description: description || undefined,
        keyFeatures: keyFeatures || undefined,
        uniqueValueProp: uniqueValueProp || undefined,
        targetAudienceDescription: targetAudienceDescription || undefined,
        commonObjections: commonObjections || undefined,
        useCases: useCases || undefined,
      })
      gooeyToast.success('Producto actualizado')
      router.push(`/stores/${product.store_id}`)
      router.refresh()
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const path = `${user.id}/${product.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('product-photos')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('product-photos')
        .getPublicUrl(path)

      await saveProductInput({
        productId: product.id,
        type: 'product_photo',
        fileUrl: publicUrl,
      })

      setPhotos((prev) => [...prev, { id: Date.now().toString(), file_url: publicUrl }])
      gooeyToast.success('Foto subida')
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al subir foto')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      await deleteProductInput(photoId)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {
      gooeyToast.error('Error al eliminar foto')
    }
  }

  async function handleWinningAdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingWinningAd(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const path = `${user.id}/${product.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('winning-ads')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('winning-ads')
        .getPublicUrl(path)

      await saveProductInput({
        productId: product.id,
        type: 'winning_ad',
        fileUrl: publicUrl,
      })

      setWinningAds((prev) => [...prev, { id: Date.now().toString(), file_url: publicUrl }])
      gooeyToast.success('Ad de referencia subido')
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al subir ad')
    } finally {
      setUploadingWinningAd(false)
      if (winningAdInputRef.current) winningAdInputRef.current.value = ''
    }
  }

  async function handleDeleteWinningAd(adId: string) {
    try {
      await deleteProductInput(adId)
      setWinningAds((prev) => prev.filter((a) => a.id !== adId))
    } catch {
      gooeyToast.error('Error al eliminar ad de referencia')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteProduct(product.id)
      router.push(`/stores/${product.store_id}`)
      router.refresh()
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al eliminar producto')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* URL auto-fill */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">✨ Completar con IA</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pegá una o más URLs (tu landing, competidores) para actualizar todos los campos automáticamente.
        </p>
        <div className="space-y-2">
          {analyzeUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="url"
                placeholder={i === 0 ? 'https://tuproducto.com' : 'https://competidor.com'}
                value={url}
                onChange={(e) => {
                  const next = [...analyzeUrls]
                  next[i] = e.target.value
                  setAnalyzeUrls(next)
                  setAnalyzeError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeUrl()}
                disabled={analyzing}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              {analyzeUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAnalyzeUrls(analyzeUrls.filter((_, j) => j !== i))}
                  disabled={analyzing}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAnalyzeUrls([...analyzeUrls, ''])}
            disabled={analyzing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Plus size={13} />
            Agregar URL
          </button>
        </div>
        <button
          type="button"
          onClick={handleAnalyzeUrl}
          disabled={analyzing || analyzeUrls.every((u) => !u.trim().startsWith('http'))}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Analizando{analyzeUrls.filter((u) => u.trim().startsWith('http')).length > 1 ? ` ${analyzeUrls.filter((u) => u.trim().startsWith('http')).length} URLs` : ''}...
            </>
          ) : (
            `Analizar${analyzeUrls.filter((u) => u.trim().startsWith('http')).length > 1 ? ` (${analyzeUrls.filter((u) => u.trim().startsWith('http')).length} URLs)` : ''}`
          )}
        </button>
        {analyzeError && <p className="text-xs text-red-400">{analyzeError}</p>}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nombre del producto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">¿Qué es y qué hace?</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué es el producto, qué hace, cómo funciona."
          className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Key features */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Características a destacar</label>
        <textarea
          rows={3}
          value={keyFeatures}
          onChange={(e) => setKeyFeatures(e.target.value)}
          placeholder="Ingredientes, formatos, certificaciones, diferenciadores técnicos."
          className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Niche */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nicho</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NICHES.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setNiche(n.key)}
              className={[
                'flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors',
                niche === n.key
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              ].join(' ')}
            >
              <span>{n.emoji}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sexo</label>
          <div className="flex gap-2">
            {([
              { value: 'male', label: 'Hombre', emoji: '♂' },
              { value: 'female', label: 'Mujer', emoji: '♀' },
              { value: 'unisex', label: 'Ambos', emoji: '⊕' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTargetSex(opt.value)}
                className={[
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border text-sm transition-colors',
                  targetSex === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                ].join(' ')}
              >
                <span>{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Rango de edad
            <span className="ml-2 font-mono text-primary font-normal">{ageMin} – {ageMax}</span>
          </label>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Mínima</span><span className="font-mono">{ageMin}</span>
              </div>
              <input type="range" min={18} max={ageMax - 1} value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Máxima</span><span className="font-mono">{ageMax}</span>
              </div>
              <input type="range" min={ageMin + 1} max={75} value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Target audience description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">¿Quién es tu cliente ideal?</label>
        <p className="text-xs text-muted-foreground">Situación, dolor, deseo, contexto de vida.</p>
        <textarea
          rows={3}
          value={targetAudienceDescription}
          onChange={(e) => setTargetAudienceDescription(e.target.value)}
          placeholder="Ej: Hombre de 30-45 años que nota adelgazamiento. Quiere solución discreta sin cambiar su rutina."
          className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Colores de marca</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Primario</span>
            <div className="flex items-center gap-2">
              <input type="color" value={hexPrimary}
                onChange={(e) => setHexPrimary(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <input type="text" value={hexPrimary}
                onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setHexPrimary(e.target.value) }}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={7} />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Secundario</span>
            <div className="flex items-center gap-2">
              <input type="color" value={hexSecondary}
                onChange={(e) => setHexSecondary(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <input type="text" value={hexSecondary}
                onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setHexSecondary(e.target.value) }}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={7} />
            </div>
          </div>
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Palabras de tono</label>
          <TagInput value={toneAdjectives} onChange={setToneAdjectives}
            placeholder="potencia, natural, científico..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Palabras a evitar</label>
          <TagInput value={wordsAvoid} onChange={setWordsAvoid}
            placeholder="barato, magia, milagro..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Claims permitidos</label>
          <TagInput value={claimsAllowed} onChange={setClaimsAllowed}
            placeholder="resultados en 30 días..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Claims prohibidos</label>
          <TagInput value={claimsForbidden} onChange={setClaimsForbidden}
            placeholder="cura diabetes, garantizado..." />
        </div>
      </div>

      {/* Strategic copy context */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">¿Por qué este y no el de la competencia?</label>
          <textarea
            rows={2}
            value={uniqueValueProp}
            onChange={(e) => setUniqueValueProp(e.target.value)}
            placeholder="Diferenciador único, por qué elegirlo sobre alternativas."
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">¿Qué frena a la gente a comprar?</label>
          <textarea
            rows={2}
            value={commonObjections}
            onChange={(e) => setCommonObjections(e.target.value)}
            placeholder="Objeciones comunes, dudas, miedos típicos del comprador."
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">¿Cuándo y cómo se usa?</label>
          <textarea
            rows={2}
            value={useCases}
            onChange={(e) => setUseCases(e.target.value)}
            placeholder="Momento de uso, frecuencia, contexto, situaciones típicas."
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
      </div>

      {/* Winning ads */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-500" />
          <label className="text-sm font-medium text-foreground">Ads ganadores de referencia</label>
        </div>
        <p className="text-xs text-muted-foreground">
          La IA analiza estos ads para inspirar copy y estructura visual en nuevos batches.
        </p>
        <div className="flex flex-wrap gap-3">
          {winningAds.map((ad) => (
            <div key={ad.id} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border">
              {ad.file_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.file_url} alt="Winning ad"
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon size={20} className="text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDeleteWinningAd(ad.id)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => winningAdInputRef.current?.click()}
            disabled={uploadingWinningAd}
            className="w-24 h-24 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {uploadingWinningAd ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={16} />
                <span className="text-[10px]">Subir</span>
              </>
            )}
          </button>
          <input
            ref={winningAdInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleWinningAdUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Product photos */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Fotos del producto</label>
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border">
              {photo.file_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.file_url} alt="Foto del producto"
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon size={20} className="text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="w-24 h-24 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {uploadingPhoto ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={16} />
                <span className="text-[10px]">Subir</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          La primera foto se usa como referencia en Gemini al generar imágenes
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/stores/${product.store_id}`)}
            className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">¿Confirmar eliminación?</span>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors"
            >
              No
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={13} />
            Eliminar producto
          </button>
        )}
      </div>
    </div>
  )
}
