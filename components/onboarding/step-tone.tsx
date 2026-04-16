export interface ToneData {
  style: 'directa' | 'científica' | 'empática' | 'aspiracional'
  formality: 'formal' | 'informal'
  customTags: string[]
  wordsAvoid: string[]
  uniqueValueProp: string
  commonObjections: string
  useCases: string
}

interface StepToneProps {
  data: ToneData
  onChange: (data: ToneData) => void
}

const STYLE_OPTIONS = [
  {
    value: 'directa' as const,
    label: 'Directa',
    desc: 'Al grano, sin rodeos. "Resultados en 30 días o te devolvemos el dinero."',
  },
  {
    value: 'científica' as const,
    label: 'Científica',
    desc: 'Datos, estudios, ingredientes. "Fórmula con 5% de Minoxidil."',
  },
  {
    value: 'empática' as const,
    label: 'Empática',
    desc: 'Entendés al cliente. "Sabemos lo frustrante que es ver el peine lleno."',
  },
  {
    value: 'aspiracional' as const,
    label: 'Aspiracional',
    desc: 'Vendés un resultado de vida. "La versión más segura de vos mismo."',
  },
]

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

export function StepTone({ data, onChange }: StepToneProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tono y propuesta de valor</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define cómo habla tu marca y qué la diferencia.
        </p>
      </div>

      <div className="space-y-5">
        {/* Style */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            1. ¿Cómo habla tu marca?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, style: opt.value })}
                className={[
                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors duration-150',
                  data.style === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40',
                ].join(' ')}
              >
                <span className={`text-sm font-medium ${data.style === opt.value ? 'text-primary' : 'text-foreground'}`}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Formality */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            2. ¿Formal o informal?
          </label>
          <div className="flex gap-0 rounded-lg border border-border overflow-hidden w-fit">
            {(['formal', 'informal'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...data, formality: opt })}
                className={[
                  'px-5 py-2 text-sm font-medium transition-colors duration-150 capitalize',
                  data.formality === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Custom tone tags */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            3. Palabras de tono (Enter o coma para agregar)
          </label>
          <TagInput
            value={data.customTags}
            onChange={(v) => onChange({ ...data, customTags: v })}
            placeholder="potencia, natural, científico..."
          />
        </div>

        {/* Words to avoid */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            4. Palabras que evitás
          </label>
          <TagInput
            value={data.wordsAvoid}
            onChange={(v) => onChange({ ...data, wordsAvoid: v })}
            placeholder="barato, magia, milagro..."
          />
        </div>

        {/* Unique value prop */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            5. ¿Por qué este y no el de la competencia?
          </label>
          <textarea
            rows={2}
            placeholder="Ej: Único con Minoxidil + Biotina en un solo paso. No necesita prescripción. Formato champú, no espuma ni cuentagotas."
            value={data.uniqueValueProp}
            onChange={(e) => onChange({ ...data, uniqueValueProp: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {/* Common objections */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            6. ¿Qué frena a la gente a comprar?
          </label>
          <textarea
            rows={2}
            placeholder="Ej: Precio alto vs. champús comunes. Miedo a resultados lentos. Desconfianza en productos online. No saben si aplica a su tipo de caída."
            value={data.commonObjections}
            onChange={(e) => onChange({ ...data, commonObjections: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {/* Use cases */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            7. ¿Cuándo y cómo se usa?
          </label>
          <textarea
            rows={2}
            placeholder="Ej: En la ducha, 3 veces por semana. Reemplaza el champú habitual. Ideal para hombres que quieren solución sin cambiar su rutina."
            value={data.useCases}
            onChange={(e) => onChange({ ...data, useCases: e.target.value })}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  )
}
