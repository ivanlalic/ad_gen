'use client'

export const AI_MODELS = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini', desc: 'Rápido · barato' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku', desc: 'Rápido · calidad' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet', desc: 'Mejor calidad' },
] as const

export type AiModelValue = (typeof AI_MODELS)[number]['value']

interface AiModelPickerProps {
  value: AiModelValue
  onChange: (v: AiModelValue) => void
  className?: string
}

export function AiModelPicker({ value, onChange, className = '' }: AiModelPickerProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-[10px] text-muted-foreground mr-1">IA:</span>
      {AI_MODELS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          title={m.desc}
          className={[
            'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border',
            value === m.value
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground',
          ].join(' ')}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
