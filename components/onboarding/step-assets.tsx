'use client'

import { Dropzone } from './dropzone'

export interface AssetsData {
  winningAds: File[]
  productPhotos: File[]
  reviewsText: string
}

interface StepAssetsProps {
  data: AssetsData
  onChange: (data: AssetsData) => void
}

export function StepAssets({ data, onChange }: StepAssetsProps) {
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
          <label className="text-sm font-medium text-foreground">Reviews de clientes</label>
          <p className="text-xs text-muted-foreground">
            Pegá reviews reales o subí un .txt. Podés generarlas con IA desde la página del producto.
          </p>

          <div className="space-y-2">
            <textarea
              placeholder={"★★★★★ María G. — Me creció pelo nuevo en 6 semanas, increíble...\n\n★★★★★ Carlos M. — Llevaba años buscando algo que funcionara..."}
              value={data.reviewsText}
              onChange={(e) => onChange({ ...data, reviewsText: e.target.value })}
              rows={6}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono resize-y"
            />

            <label className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-fit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Subir .txt
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleReviewFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {data.reviewsText && (
            <p className="text-xs text-muted-foreground">
              ✓ {data.reviewsText.split('\n').filter(Boolean).length} líneas cargadas
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
