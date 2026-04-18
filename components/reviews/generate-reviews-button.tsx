'use client'

import { useState } from 'react'
import { saveGeneratedReviews, type GeneratedReview } from '@/lib/actions/reviews'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { AiModelPicker, type AiModelValue } from '@/components/ui/ai-model-picker'

interface GenerateReviewsButtonProps {
  productId: string
  productName: string
}

const STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

export function GenerateReviewsButton({ productId, productName }: GenerateReviewsButtonProps) {
  const [state, setState] = useState<'idle' | 'generating' | 'preview' | 'saving'>('idle')
  const [reviews, setReviews] = useState<GeneratedReview[]>([])
  const [model, setModel] = useState<AiModelValue>('gemini-3.1-flash-lite-preview')

  async function handleGenerate() {
    setState('generating')
    const toastId = gooeyToast(`Generando reviews para ${productName}...`, {
      duration: Infinity,
    })

    try {
      const res = await fetch('/api/generate/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, model }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Error generando reviews')
      }

      const { reviews: generated } = await res.json()
      setReviews(generated)
      setState('preview')
      gooeyToast.update(toastId, {
        title: `✓ ${generated.length} reviews generadas`,
        description: 'Revisá antes de confirmar',
        type: 'success',
      })
    } catch (err) {
      gooeyToast.update(toastId, {
        title: 'Error',
        description: err instanceof Error ? err.message : 'Intentá de nuevo',
        type: 'error',
      })
      setState('idle')
    }
  }

  async function handleConfirm() {
    setState('saving')
    const toastId = gooeyToast('Guardando reviews...', { duration: Infinity })
    try {
      await saveGeneratedReviews(productId, reviews)
      gooeyToast.update(toastId, {
        title: '✓ Reviews guardadas',
        description: `${reviews.length} reviews listas para usar`,
        type: 'success',
      })
      setState('idle')
      setReviews([])
    } catch {
      gooeyToast.update(toastId, {
        title: 'Error al guardar',
        type: 'error',
      })
      setState('preview')
    }
  }

  if (state === 'preview' || state === 'saving') {
    return (
      <div className="mt-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {reviews.length} reviews generadas
            <span className="ml-2 text-xs text-muted-foreground font-normal">— revisá antes de confirmar</span>
          </span>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Descartar
          </button>
        </div>

        {/* Reviews list */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {reviews.map((r, i) => (
            <div key={i} className="p-3 bg-secondary border border-border rounded-lg text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground text-xs">
                  {r.reviewer_name}, {r.age} años
                </span>
                <span className="text-yellow-400 text-xs">{STARS[r.rating]}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-xs">{r.text}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={state === 'saving'}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Regenerar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state === 'saving'}
            className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {state === 'saving' ? 'Guardando...' : `Confirmar ${reviews.length} reviews →`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={state === 'generating'}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
      >
        {state === 'generating' ? (
          <>
            <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Generar reviews con IA
          </>
        )}
      </button>
      <AiModelPicker value={model} onChange={setModel} />
    </div>
  )
}
