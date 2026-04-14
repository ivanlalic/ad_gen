export interface AudienceData {
  targetSex: 'male' | 'female' | 'unisex'
  targetAgeMin: number
  targetAgeMax: number
}

interface StepAudienceProps {
  data: AudienceData
  onChange: (data: AudienceData) => void
}

const SEX_OPTIONS = [
  { value: 'male', label: 'Hombre', emoji: '♂' },
  { value: 'female', label: 'Mujer', emoji: '♀' },
  { value: 'unisex', label: 'Ambos', emoji: '⊕' },
] as const

export function StepAudience({ data, onChange }: StepAudienceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Audiencia target</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define quién ve tus ads. Afecta los reviews simulados y el tono del copy.
        </p>
      </div>

      <div className="space-y-5">
        {/* Sex */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sexo</label>
          <div className="flex gap-2">
            {SEX_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, targetSex: opt.value })}
                className={[
                  'flex-1 flex flex-col items-center gap-1.5 py-3 px-4 rounded-lg border text-sm transition-colors duration-150',
                  data.targetSex === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                ].join(' ')}
              >
                <span className="text-xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Rango de edad
            <span className="ml-2 font-mono text-primary font-normal">
              {data.targetAgeMin} – {data.targetAgeMax}
            </span>
          </label>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Edad mínima</span>
                <span className="font-mono text-foreground">{data.targetAgeMin}</span>
              </div>
              <input
                type="range"
                min={18}
                max={data.targetAgeMax - 1}
                value={data.targetAgeMin}
                onChange={(e) => onChange({ ...data, targetAgeMin: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Edad máxima</span>
                <span className="font-mono text-foreground">{data.targetAgeMax}</span>
              </div>
              <input
                type="range"
                min={data.targetAgeMin + 1}
                max={75}
                value={data.targetAgeMax}
                onChange={(e) => onChange({ ...data, targetAgeMax: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
