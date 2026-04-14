import { NICHES } from '@/lib/constants/niches'

interface NicheSelectorProps {
  value: string
  onChange: (key: string) => void
}

export function NicheSelector({ value, onChange }: NicheSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {NICHES.map((niche) => {
        const selected = value === niche.key
        return (
          <button
            key={niche.key}
            type="button"
            onClick={() => onChange(niche.key)}
            className={[
              'relative flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150',
              selected
                ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]'
                : 'border-border bg-card hover:border-primary/40 hover:bg-secondary',
            ].join(' ')}
          >
            {/* Color swatch */}
            <div className="flex gap-1.5">
              <span
                className="w-4 h-4 rounded-full ring-1 ring-black/10"
                style={{ background: niche.hexPrimary }}
              />
              <span
                className="w-4 h-4 rounded-full ring-1 ring-black/10"
                style={{ background: niche.hexSecondary }}
              />
            </div>

            <div>
              <div className="text-lg leading-none mb-1">{niche.emoji}</div>
              <div className={`text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>
                {niche.label}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {niche.toneAdjectives.slice(0, 2).join(' · ')}
              </div>
            </div>

            {selected && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
