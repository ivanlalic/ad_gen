import { getNicheConfig } from '@/lib/constants/niches'

export interface ColorData {
  hexPrimary: string
  hexSecondary: string
}

interface StepColorsProps {
  niche: string
  data: ColorData
  onChange: (data: ColorData) => void
}

export function StepColors({ niche, data, onChange }: StepColorsProps) {
  const nicheConfig = getNicheConfig(niche)
  const defaultPrimary = nicheConfig?.hexPrimary ?? '#6366f1'
  const defaultSecondary = nicheConfig?.hexSecondary ?? '#1a1a24'

  function resetToDefaults() {
    onChange({ hexPrimary: defaultPrimary, hexSecondary: defaultSecondary })
  }

  const isDefault =
    data.hexPrimary === defaultPrimary && data.hexSecondary === defaultSecondary

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Paleta de colores</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Inferida del nicho. Podés sobreescribir si tu marca tiene colores propios.
        </p>
      </div>

      {/* Preview card */}
      <div
        className="relative rounded-xl overflow-hidden border border-border"
        style={{ background: data.hexPrimary }}
      >
        <div className="p-6">
          <div
            className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
            style={{ background: data.hexSecondary, color: data.hexPrimary }}
          >
            NUEVO
          </div>
          <div className="text-white font-semibold text-lg">
            Vista previa del ad
          </div>
          <div className="text-white/70 text-sm mt-1">
            Así se verán los colores en tus ads generados
          </div>
          <div className="mt-4">
            <div
              className="inline-block px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: data.hexSecondary, color: data.hexPrimary }}
            >
              Comprar ahora →
            </div>
          </div>
        </div>
      </div>

      {/* Pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Color primario</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.hexPrimary}
              onChange={(e) => onChange({ ...data, hexPrimary: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={data.hexPrimary}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange({ ...data, hexPrimary: v })
              }}
              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={7}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Color secundario</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.hexSecondary}
              onChange={(e) => onChange({ ...data, hexSecondary: e.target.value })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={data.hexSecondary}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange({ ...data, hexSecondary: v })
              }}
              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {!isDefault && (
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ↩ Volver a los colores del nicho
        </button>
      )}
    </div>
  )
}
