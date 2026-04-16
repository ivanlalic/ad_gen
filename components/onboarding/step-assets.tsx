'use client'

import { useState } from 'react'
import { Dropzone } from './dropzone'

export interface AssetsData {
  winningAds: File[]
  productPhotos: File[]
  reviewsText: string
}

interface StepAssetsProps {
  data: AssetsData
  onChange: (data: AssetsData) => void
  onGenerateReviews?: () => Promise<string>
}

const STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

export function StepAssets({ data, onChange, onGenerateReviews }: StepAssetsProps) {
  const [reviewsTab, setReviewsTab] = useState<'paste' | 'upload'>('paste')
  const [generatingReviews, setGeneratingReviews] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState<Array<{ reviewer_name: string; age: number; text: string; rating: number }> | null>(null)

  async function handleGenerateReviews() {
    if (!onGenerateReviews) return
    setGeneratingReviews(true)
    try {
      const json = await onGenerateReviews()
      const parsed = JSON.parse(json) as Array<{ reviewer_name: string; age: number; text: string; rating: number }>
      setGeneratedPreview(parsed)
    } catch {
      // error handled in wizard
    } finally {
      setGeneratingReviews(false)
    }
  }

  function confirmGeneratedReviews() {
    if (!generatedPreview) return
    const text = generatedPreview
      .map((r) => `${STARS[r.rating]} ${r.reviewer_name}, ${r.age} años — ${r.text}`)
      .join('\n\n')
    onChange({ ...data, reviewsText: text })
    setGeneratedPreview(null)
  }

  function handleReviewFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange({ ...data, reviewsText: (ev.target?.result as string) || '' })
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Assets e inputs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cuantos más inputs reales, mejor el grounding de los conceptos.
        </p>
      </div>

      <div className="space-y-5">
        {/* Winning ads */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Winning ads{' '}
            <span className="text-muted-foreground font-normal">(screenshots Meta)</span>
          </label>
          <Dropzone
            label="Arrastrá o hacé click para subir"
            hint="10–20 screenshots de tus mejores ads — JPG, PNG, WebP"
            maxFiles={20}
            files={data.winningAds}
            onFilesChange={(files) => onChange({ ...data, winningAds: files })}
          />
        </div>

        {/* Product photos */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Fotos del producto
          </label>
          <Dropzone
            label="Arrastrá o hacé click para subir"
            hint="Fotos del producto (packshot, lifestyle, ingredientes)"
            maxFiles={10}
            files={data.productPhotos}
            onFilesChange={(files) => onChange({ ...data, productPhotos: files })}
          />
        </div>

        {/* Reviews */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Reviews de clientes</label>
            {onGenerateReviews && !generatedPreview && (
              <button
                type="button"
                onClick={handleGenerateReviews}
                disabled={generatingReviews}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {generatingReviews ? (
                  <>
                    <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
                    Generando...
                  </>
                ) : '✨ Generar con IA'}
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pegá reviews reales o subí un .txt. Si no tenés, generalas con IA.
          </p>

          {/* Tabs */}
          <div className="flex gap-0 rounded-lg border border-border overflow-hidden w-fit text-sm">
            {(['paste', 'upload'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setReviewsTab(tab)}
                className={[
                  'px-4 py-1.5 transition-colors duration-150',
                  reviewsTab === tab
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {tab === 'paste' ? 'Pegar texto' : 'Subir .txt'}
              </button>
            ))}
          </div>

          {reviewsTab === 'paste' ? (
            <textarea
              placeholder={"★★★★★ María G. — Me creció pelo nuevo en 6 semanas, increíble...\n\n★★★★★ Carlos M. — Llevaba años buscando algo que funcionara..."}
              value={data.reviewsText}
              onChange={(e) => onChange({ ...data, reviewsText: e.target.value })}
              rows={6}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono resize-y"
            />
          ) : (
            <label className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-fit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Seleccionar archivo .txt
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleReviewFileUpload}
                className="hidden"
              />
            </label>
          )}

          {/* AI generated preview */}
          {generatedPreview && (
            <div className="space-y-2">
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {generatedPreview.slice(0, 5).map((r, i) => (
                  <div key={i} className="p-2.5 bg-secondary border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{r.reviewer_name}, {r.age}a</span>
                      <span className="text-yellow-400 text-xs">{STARS[r.rating]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                  </div>
                ))}
                {generatedPreview.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{generatedPreview.length - 5} reviews más
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGeneratedPreview(null)}
                  className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={confirmGeneratedReviews}
                  className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Usar {generatedPreview.length} reviews →
                </button>
              </div>
            </div>
          )}

          {data.reviewsText && !generatedPreview && (
            <p className="text-xs text-muted-foreground">
              ✓ {data.reviewsText.split('\n').filter(Boolean).length} líneas cargadas
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
