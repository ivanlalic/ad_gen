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
import { createProduct, saveProductInput } from '@/lib/actions/products'
import { getNicheConfig } from '@/lib/constants/niches'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { createClient } from '@/lib/supabase/client'

const TOTAL_STEPS = 6

export function OnboardingWizard() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(new Set())

  const [storeData, setStoreData] = useState<StoreData>({ name: '', country: 'ES' })
  const [productData, setProductData] = useState<ProductBasicData>({ name: '', niche: '' })
  const [audienceData, setAudienceData] = useState<AudienceData>({
    targetSex: 'unisex',
    targetAgeMin: 25,
    targetAgeMax: 55,
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

  function validateStep(s: number): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}
    switch (s) {
      case 0:
        if (!storeData.name.trim()) errors.name = 'Ingresá un nombre'
        if (!storeData.country) errors.country = 'Elegí un país'
        break
      case 1:
        if (!productData.name.trim()) errors.name = 'Ingresá un nombre'
        if (!productData.niche) errors.niche = 'Elegí un nicho'
        break
    }
    return { valid: Object.keys(errors).length === 0, errors }
  }

  const currentValidation = validateStep(step)
  const showErrors = attemptedSteps.has(step)

  function handleNext() {
    const { valid } = validateStep(step)
    if (!valid) {
      setAttemptedSteps((prev) => new Set(prev).add(step))
      return
    }
    setStep((s) => s + 1)
  }

  async function handleFinish() {
    setSaving(true)
    const toastId = gooeyToast('Guardando tienda...', {
      duration: Infinity,
    })

    try {
      // 1. Create store
      const storeId = await createStore({
        name: storeData.name,
        country: storeData.country,
      })

      gooeyToast.update(toastId, {
        title: '✓ Tienda creada',
        description: 'Guardando producto...',
      })

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
      })

      gooeyToast.update(toastId, {
        title: '✓ Producto guardado',
        description: 'Subiendo archivos...',
      })

      // 3. Upload files to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const uploadFile = async (
        file: File,
        bucket: string,
        inputType: 'winning_ad' | 'product_photo'
      ) => {
        const path = `${user.id}/${productId}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from(bucket).upload(path, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
        await saveProductInput({ productId, type: inputType, fileUrl: publicUrl })
      }

      for (const file of assetsData.winningAds) {
        await uploadFile(file, 'winning-ads', 'winning_ad')
      }
      for (const file of assetsData.productPhotos) {
        await uploadFile(file, 'product-photos', 'product_photo')
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
      }

      gooeyToast.update(toastId, {
        title: '✓ ¡Todo listo!',
        description: `${productData.name} está configurado`,
        type: 'success',
      })

      router.push('/stores')
      router.refresh()
    } catch (err) {
      gooeyToast.update(toastId, {
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : 'Intentá de nuevo',
        type: 'error',
      })
      setSaving(false)
    }
  }

  const stepProps = [
    <StepStore
      key="store"
      data={storeData}
      onChange={setStoreData}
      errors={showErrors ? currentValidation.errors : undefined}
    />,
    <StepProduct
      key="product"
      data={productData}
      onChange={handleNicheChange}
      errors={showErrors ? currentValidation.errors : undefined}
    />,
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
              onClick={handleNext}
              aria-disabled={!currentValidation.valid || undefined}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity aria-disabled:opacity-60"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
