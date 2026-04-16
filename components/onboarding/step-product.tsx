import { useState } from 'react'
import { NicheSelector } from './niche-selector'
import { getNicheConfig } from '@/lib/constants/niches'

export interface ProductBasicData {
  name: string
  niche: string
  description: string
  keyFeatures: string
}

interface StepProductProps {
  data: ProductBasicData
  onChange: (data: ProductBasicData) => void
  onAnalyzeUrl: (url: string) => Promise<void>
}

export function StepProduct({ data, onChange, onAnalyzeUrl }: StepProductProps) {
  const nicheConfig = getNicheConfig(data.niche)
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (!url.trim()) return
    setAnalyzing(true)
    setUrlError(null)
    try {
      await onAnalyzeUrl(url.trim())
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Error al analizar la URL')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tu producto</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cuanto más contexto des, mejor serán los copies.
        </p>
      </div>

      {/* URL auto-fill */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">✨ Completar con IA</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Nuevo</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pegá la URL de tu landing o de un competidor y la IA completa todos los campos automáticamente.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://tuproducto.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            disabled={analyzing}
            className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !url.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Analizando...
              </>
            ) : 'Analizar'}
          </button>
        </div>
        {urlError && (
          <p className="text-xs text-red-400">{urlError}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Nombre del producto
          </label>
          <input
            type="text"
            placeholder="Ej: ExCalvo Champú Crecimiento"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nicho</label>
          <NicheSelector
            value={data.niche}
            onChange={(key) => onChange({ ...data, niche: key })}
          />
        </div>

        {nicheConfig && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border text-xs text-muted-foreground">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3.5 h-3.5 rounded-full" style={{ background: nicheConfig.hexPrimary }} />
              <span className="w-3.5 h-3.5 rounded-full" style={{ background: nicheConfig.hexSecondary }} />
            </div>
            Paleta y tono inferidos: <span className="text-foreground font-medium">{nicheConfig.toneAdjectives.join(', ')}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            ¿Qué es y qué hace?
          </label>
          <textarea
            rows={3}
            placeholder="Ej: Champú con Minoxidil al 2% para hombres con caída. Estimula el folículo, aumenta la densidad en 8 semanas."
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Características que querés destacar
          </label>
          <textarea
            rows={3}
            placeholder="Ej: Sin sulfatos, sin parabenos. Olor a menta. Resultados visibles en 30 días. Dermatológicamente testeado."
            value={data.keyFeatures}
            onChange={(e) => onChange({ ...data, keyFeatures: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  )
}
