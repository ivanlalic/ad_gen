'use client'

import { AD_FORMATS, type AdFormat } from '@/lib/ad-formats'

interface FormatSelectorProps {
  value: AdFormat
  onChange: (format: AdFormat) => void
}

// Visual dimensions for format thumbnail (px, scaled for display)
const THUMB: Record<AdFormat, { w: number; h: number }> = {
  '4:5':  { w: 32, h: 40 },
  '9:16': { w: 22, h: 39 },
  '1:1':  { w: 36, h: 36 },
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(AD_FORMATS) as AdFormat[]).map(format => {
        const spec = AD_FORMATS[format]
        const thumb = THUMB[format]
        const active = value === format

        return (
          <button
            key={format}
            type="button"
            onClick={() => onChange(format)}
            className={[
              'flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-colors duration-150',
              active
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/40',
            ].join(' ')}
          >
            {/* Format thumbnail */}
            <div
              className={[
                'rounded border-2 transition-colors duration-150',
                active ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-muted/30',
              ].join(' ')}
              style={{ width: thumb.w, height: thumb.h }}
            />

            <div>
              <div className={['text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground'].join(' ')}>
                {format}
              </div>
              <div className={['text-[10px] mt-0.5', active ? 'text-foreground/70' : 'text-muted-foreground/70'].join(' ')}>
                {spec.label}
              </div>
            </div>

            {/* Placements list */}
            <div className="space-y-0.5 w-full">
              {spec.placements.slice(0, 2).map(p => (
                <div key={p} className="text-[9px] text-muted-foreground/60 truncate">{p}</div>
              ))}
              {spec.placements.length > 2 && (
                <div className="text-[9px] text-muted-foreground/40">+{spec.placements.length - 2} más</div>
              )}
            </div>

            {spec.isDefault && (
              <span className="text-[9px] font-medium text-primary/70">Recomendado</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
