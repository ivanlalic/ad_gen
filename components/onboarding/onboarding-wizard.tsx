'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from './step-indicator'
import { StepStore, type StoreData } from './step-store'
import { StepProduct, type ProductBasicData } from './step-product'
import { StepAudience, type AudienceData } from './step-audience'
import { StepColors, type ColorData } from './step-colors'
import { StepTone, type ToneData } from './step-tone'
import { StepAssets, type AssetsData } from './step-assets'
import { createStore } from '@/lib/actions/stores'
import { createProduct, saveProductInput, markProductHasReviews } from '@/lib/actions/products'
import { getNicheConfig } from '@/lib/constants/niches'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { createClient } from '@/lib/supabase/client'

const TOTAL_STEPS = 6

export function OnboardingWizard({ existingStoreId }: { existingStoreId?: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(existingStoreId ? 1 : 0)
  const [saving, setSaving] = useState(false)

  const [storeData, setStoreData] = useState<StoreData>({ name: '', country: 'ES' })
  const [productData, setProductData] = useState<ProductBasicData>({ name: '', niche: '', description: '', keyFeatures: '' })
  const [audienceData, setAudienceData] = useState<AudienceData>({
    targetSex: 'unisex',
    targetAgeMin: 25,
    targetAgeMax: 55,
    targetAudienceDescription: '',
  })
  const [colorData, setColorData] = useState<ColorData>({
    hexPrimary: '#6366f1',
    hexSecondary: '#1a1a24',
  })
  const [toneData, setToneData] = useState<ToneData>({
    style: 'directa',
    formality: 'informal',
    customTags: [],
    wordsAvoid: [],
    uniqueValueProp: '',
    commonObjections: '',
    useCases: '',
  })
  const [assetsData, setAssetsData] = useState<AssetsData>({
    winningAds: [],
    productPhotos: [],
    reviewsText: '',
  })

  // Sync colors when niche changes
  function handleNicheChange(updated: ProductBasicData) {
    setProductData(updated)
    const config = getNicheConfig(updated.niche)
    if (config) {
      setColorData({ hexPrimary: config.hexPrimary, hexSecondary: config.hexSecondary })
      setToneData((prev) => ({ ...prev, customTags: config.toneAdjectives }))
    }
  }

  // URL → AI auto-fill all product fields
  async function handleAnalyzeUrl(url: string) {
    const res = await fetch('/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, country: storeData.country }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al analizar la URL')

    setProductData({
      name: data.name ?? productData.name,
      niche: data.niche ?? productData.niche,
      description: data.description ?? '',
      keyFeatures: data.keyFeatures ?? '',
    })
    setAudienceData({
      targetSex: data.targetSex ?? 'unisex',
      targetAgeMin: data.targetAgeMin ?? 25,
      targetAgeMax: data.targetAgeMax ?? 50,
      targetAudienceDescription: data.targetAudienceDescription ?? '',
    })
    setColorData({
      hexPrimary: data.hexPrimary ?? '#6366f1',
      hexSecondary: data.hexSecondary ?? '#1a1a24',
    })
    setToneData((prev) => ({
      ...prev,
      style: data.toneStyle ?? 'directa',
      customTags: data.toneAdjectives ?? [],
      uniqueValueProp: data.uniqueValueProp ?? '',
      commonObjections: data.commonObjections ?? '',
      useCases: data.useCases ?? '',
    }))

    gooeyToast.success('Campos completados con IA — revisá y ajustá')
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0: return storeData.name.trim().length > 0 && storeData.country.length > 0
      case 1: return productData.name.trim().length > 0 && productData.niche.length > 0
      case 2: return true
      case 3: return true // colors always valid
      case 4: return true
      case 5: return true
      default: return false
    }
  }

  async function handleFinish() {
    setSaving(true)
    const toastId = gooeyToast(existingStoreId ? 'Guardando producto...' : 'Guardando tienda...', {
      duration: Infinity,
    })

    try {
      // 1. Create or reuse store
      let storeId: string
      if (existingStoreId) {
        storeId = existingStoreId
      } else {
        storeId = await createStore({
          name: storeData.name,
          country: storeData.country,
        })
        gooeyToast.update(toastId, {
          title: '✓ Tienda creada',
          description: 'Guardando producto...',
        })
      }

      // 2. Create product
      const productId = await createProduct({
        storeId,
        name: productData.name,
        niche: productData.niche,
        targetSex: audienceData.targetSex,
        targetAgeMin: audienceData.targetAgeMin,
        targetAgeMax: audienceData.targetAgeMax,
        hexPrimary: colorData.hexPrimary,
        hexSecondary: colorData.hexSecondary,
        toneAdjectives: toneData.customTags,
        wordsAvoid: toneData.wordsAvoid,
        claimsAllowed: [],
        claimsForbidden: [],
        description: productData.description || undefined,
        keyFeatures: productData.keyFeatures || undefined,
        uniqueValueProp: toneData.uniqueValueProp || undefined,
        targetAudienceDescription: audienceData.targetAudienceDescription || undefined,
        commonObjections: toneData.commonObjections || undefined,
        useCases: toneData.useCases || undefined,
      })

      gooeyToast.update(toastId, {
        title: '✓ Producto guardado',
        description: 'Subiendo archivos...',
      })

      // 3. Upload files to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const allFiles = [
        ...assetsData.winningAds.map((f) => ({ file: f, bucket: 'winning-ads', inputType: 'winning_ad' as const })),
        ...assetsData.productPhotos.map((f) => ({ file: f, bucket: 'product-photos', inputType: 'product_photo' as const })),
      ]

      for (let i = 0; i < allFiles.length; i++) {
        const { file, bucket, inputType } = allFiles[i]
        gooeyToast.update(toastId, {
          title: `Subiendo archivo ${i + 1} / ${allFiles.length}`,
          description: file.name,
        })
        try {
          const path = `${user.id}/${productId}/${Date.now()}-${file.name}`
          // 30s timeout per file
          const uploadPromise = supabase.storage.from(bucket).upload(path, file)
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout')), 30_000)
          )
          const { error } = await Promise.race([uploadPromise, timeoutPromise])
          if (error) throw error
          const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
          await saveProductInput({ productId, type: inputType, fileUrl: publicUrl })
        } catch (uploadErr) {
          // Skip failed uploads — don't block product creation
          console.warn(`Upload skipped (${file.name}):`, uploadErr)
        }
      }

      // 4. Save reviews text
      if (assetsData.reviewsText.trim()) {
        await saveProductInput({
          productId,
          type: 'review',
          contentText: assetsData.reviewsText,
          source: 'manual',
          isSimulated: false,
        })
        await markProductHasReviews(productId)
      }

      gooeyToast.update(toastId, {
        title: '✓ ¡Todo listo!',
        description: `${productData.name} está configurado`,
        type: 'success',
      })

      router.push(`/stores/${storeId}`)
      router.refresh()
    } catch (err) {
      console.error('[handleFinish]', err)
      gooeyToast.update(toastId, {
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : 'Intentá de nuevo',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const stepProps = [
    <StepStore key="store" data={storeData} onChange={setStoreData} />,
    <StepProduct key="product" data={productData} onChange={handleNicheChange} onAnalyzeUrl={handleAnalyzeUrl} />,
    <StepAudience key="audience" data={audienceData} onChange={setAudienceData} />,
    <StepColors key="colors" niche={productData.niche} data={colorData} onChange={setColorData} />,
    <StepTone key="tone" data={toneData} onChange={setToneData} />,
    <StepAssets key="assets" data={assetsData} onChange={setAssetsData} />,
  ]

  const isLastStep = step === TOTAL_STEPS - 1

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <span className="text-foreground font-semibold">
            Ad<span className="text-primary">Gen</span> 2.0
          </span>
          <StepIndicator current={step} />
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          {stepProps[step]}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
          >
            ← Atrás
          </button>

          <span className="text-xs text-muted-foreground">
            {step + 1} / {TOTAL_STEPS}
          </span>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Completar setup →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
