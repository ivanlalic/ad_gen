export type AdFormat = '4:5' | '9:16' | '1:1'

export interface FormatSpec {
  id: AdFormat
  label: string
  description: string
  placements: string[]
  width: number
  height: number
  safeZones: {
    top: number     // % of height to keep free from top
    bottom: number  // % of height to keep free from bottom
    left: number    // % of width to keep free from left
    right: number   // % of width to keep free from right
  }
  compositionNotes: string
  isDefault?: boolean
}

export const AD_FORMATS: Record<AdFormat, FormatSpec> = {
  '4:5': {
    id: '4:5',
    label: 'Feed Vertical',
    description: 'Facebook Feed + Instagram Feed',
    placements: ['Facebook Feed', 'Instagram Feed', 'Facebook Marketplace', 'Instagram Explore'],
    width: 1440,
    height: 1800,
    safeZones: {
      top: 8,
      bottom: 8,
      left: 6,
      right: 6,
    },
    compositionNotes: `
- El texto del anuncio (primary text, headline) aparece DEBAJO de la imagen, no encima
- No hay UI overlay de Meta sobre la imagen en feed — máxima libertad creativa
- El sujeto principal debe ocupar el 60-70% superior del frame
- Logos y branding: preferentemente en la zona superior, con margen mínimo del 8%
- Text overlays propios: zona central (entre 15% y 75% del alto)
- Mantener al menos 6% de margen en todos los bordes
- El formato 4:5 ocupa más pantalla en mobile → más dwell time → mejor performance
    `.trim(),
    isDefault: true,
  },
  '9:16': {
    id: '9:16',
    label: 'Stories / Reels',
    description: 'Facebook Stories, Instagram Stories, Reels',
    placements: ['Facebook Stories', 'Instagram Stories', 'Facebook Reels', 'Instagram Reels', 'Ads on Facebook Reels'],
    width: 1080,
    height: 1920,
    safeZones: {
      top: 14,     // Meta UI: profile pic + advertiser name + mute button
      bottom: 35,  // Meta UI: CTA button, caption, Reels controls
      left: 6,
      right: 6,
    },
    compositionNotes: `
- ZONA SEGURA CRÍTICA: Top 14% y Bottom 35% deben estar VACÍOS de contenido importante
- Top 14% (~269px): ocupado por foto de perfil del anunciante, nombre, botón mute
- Bottom 35% (~672px): ocupado por CTA button, descripción del ad, controles de Reels
- Zona activa real: entre 14% y 65% del alto (el centro del frame)
- Sujeto principal: centrado horizontalmente, en la franja 20%-60% del alto
- Logo/branding: entre 15% y 25% del alto (justo debajo del área de perfil)
- CTA propio si se incluye texto: entre 55% y 62% del alto (sobre el área de botones de Meta)
- Mantener 6% de margen lateral
- Stories estáticas duran solo 5 segundos → mensaje inmediato, sin texto largo
    `.trim(),
  },
  '1:1': {
    id: '1:1',
    label: 'Cuadrado',
    description: 'Universal — todos los placements básicos',
    placements: ['Facebook Feed', 'Instagram Feed', 'Facebook Marketplace', 'Instagram Explore', 'Messenger'],
    width: 1440,
    height: 1440,
    safeZones: {
      top: 8,
      bottom: 8,
      left: 6,
      right: 6,
    },
    compositionNotes: `
- Formato universal: funciona en todos los placements sin restricciones
- Menos impacto visual en mobile que 4:5 (ocupa menos pantalla vertical)
- Ideal para carousel ads donde la consistencia visual entre cards importa
- Sujeto principal: centrado, ocupando 50-65% del frame
- Texto overlay: zona central, evitar los primeros y últimos 8% del borde
- Sin UI overlay de Meta en feed — libertad compositiva total
- Recomendado para: product shots limpios, carruseles, remarketing
    `.trim(),
  },
}

export const DEFAULT_FORMAT: AdFormat = '4:5'

export function getFormatDimensions(format: AdFormat): { width: number; height: number } {
  const spec = AD_FORMATS[format]
  return { width: spec.width, height: spec.height }
}

export function getSafeZonePromptInstructions(format: AdFormat): string {
  if (format === '9:16') {
    return `
COMPOSITION GUIDELINES (internal directives — do NOT render any of this as text, labels, or markings in the image):

This is a tall vertical creative designed to be viewed on a phone screen. Compose the scene so that:
- The main subject and all critical visual elements are placed in the CENTRAL BAND of the frame — roughly the middle vertical portion of the image, well below the top edge and well above the bottom edge
- Leave the upper strip of the image relatively clear and uncluttered — this area will be covered by platform interface elements when the ad runs
- Leave the lower portion of the image relatively clear — this area will also be covered by platform interface elements including buttons and captions
- Any text overlay or logo you design must live in the central band only, never in the top strip or the lower portion
- Keep comfortable breathing room from the left and right edges
- Visual hierarchy: hero subject centered, supporting elements radiating from the center

The final image must contain ONLY the intentional visual scene described below. Do not draw guides, rulers, frames, labels, border lines, area indicators, or any instructional markings of any kind.
`.trim()
  }

  if (format === '1:1') {
    return `
COMPOSITION GUIDELINES (internal directives — do NOT render any of this as text, labels, or markings in the image):

This is a square creative. Compose the scene so that:
- The main subject is centered and occupies a generous, prominent portion of the frame
- Keep comfortable breathing room between all elements and every edge — nothing should feel cramped against the border
- Any text overlay stays well inside the frame, away from all edges
- Supporting elements balance around the central subject

The final image must contain ONLY the intentional visual scene described below. Do not draw guides, rulers, frames, labels, border lines, area indicators, or any instructional markings of any kind.
`.trim()
  }

  // 4:5 (default)
  return `
COMPOSITION GUIDELINES (internal directives — do NOT render any of this as text, labels, or markings in the image):

This is a vertical rectangular creative. Compose the scene so that:
- The main subject occupies the upper and central area of the frame with strong visual presence
- Keep comfortable breathing room between all elements and every edge
- Any text overlay stays well inside the frame, away from all edges
- Logo or branding elements placed in the upper area with clear space around them

The final image must contain ONLY the intentional visual scene described below. Do not draw guides, rulers, frames, labels, border lines, area indicators, or any instructional markings of any kind.
`.trim()
}
