'use client'

import { AD_FORMATS, type AdFormat } from '@/lib/ad-formats'

interface SafeZonePreviewProps {
  imageUrl: string
  format: AdFormat
  showOverlay: boolean
}

export function SafeZonePreview({ imageUrl, format, showOverlay }: SafeZonePreviewProps) {
  const spec = AD_FORMATS[format]
  const sz = spec.safeZones
  const is916 = format === '9:16'

  return (
    <div className="relative w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />

      {showOverlay && (
        <>
          {/* Top danger zone */}
          {sz.top > 0 && (
            <div
              className="absolute inset-x-0 top-0 bg-red-500/30 border-b border-red-400/50 flex items-center justify-center"
              style={{ height: `${sz.top}%` }}
            >
              {is916 && (
                <span className="text-[8px] text-white/90 font-medium bg-black/40 px-1.5 py-0.5 rounded">
                  ⚠ UI Meta — perfil + mute
                </span>
              )}
            </div>
          )}

          {/* Bottom danger zone */}
          {sz.bottom > 0 && (
            <div
              className="absolute inset-x-0 bottom-0 bg-red-500/30 border-t border-red-400/50 flex items-center justify-center"
              style={{ height: `${sz.bottom}%` }}
            >
              {is916 && (
                <span className="text-[8px] text-white/90 font-medium bg-black/40 px-1.5 py-0.5 rounded">
                  ⚠ UI Meta — CTA + controles
                </span>
              )}
            </div>
          )}

          {/* Side margins (left) */}
          <div
            className="absolute inset-y-0 left-0 bg-yellow-500/10 border-r border-yellow-400/20"
            style={{ width: `${sz.left}%`, top: `${sz.top}%`, height: `${100 - sz.top - sz.bottom}%` }}
          />

          {/* Side margins (right) */}
          <div
            className="absolute inset-y-0 right-0 bg-yellow-500/10 border-l border-yellow-400/20"
            style={{ width: `${sz.right}%`, top: `${sz.top}%`, height: `${100 - sz.top - sz.bottom}%` }}
          />

          {/* Active zone indicator — green outline */}
          <div
            className="absolute border border-green-400/50 pointer-events-none"
            style={{
              top: `${sz.top}%`,
              bottom: `${sz.bottom}%`,
              left: `${sz.left}%`,
              right: `${sz.right}%`,
            }}
          />

          {/* Label for non-916 formats */}
          {!is916 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] text-green-300/80 font-medium bg-black/30 px-1.5 py-0.5 rounded">
                ✓ Zona libre
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
