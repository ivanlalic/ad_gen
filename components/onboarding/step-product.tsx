import { NicheSelector } from './niche-selector'
import { getNicheConfig } from '@/lib/constants/niches'
import { FormField } from '@/components/ui/form-field'

export interface ProductBasicData {
  name: string
  niche: string
}

interface StepProductProps {
  data: ProductBasicData
  onChange: (data: ProductBasicData) => void
  errors?: Record<string, string>
}

export function StepProduct({ data, onChange, errors }: StepProductProps) {
  const nicheConfig = getNicheConfig(data.niche)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tu producto</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El nicho define la paleta de colores y el tono base por defecto.
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          htmlFor="product-name"
          label="Nombre del producto"
          error={errors?.name}
        >
          <input
            id="product-name"
            type="text"
            placeholder="Ej: ExCalvo Champú Crecimiento"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            aria-invalid={errors?.name ? true : undefined}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/30"
          />
        </FormField>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nicho</label>
          {errors?.niche && (
            <p role="alert" className="text-xs text-destructive">
              {errors.niche}
            </p>
          )}
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
      </div>
    </div>
  )
}
