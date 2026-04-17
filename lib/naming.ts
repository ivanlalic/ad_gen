import type { AdFormat } from '@/lib/ad-formats'

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)
}

export function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

export function formatDateKey(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const aa = String(date.getFullYear()).slice(-2)
  return `${dd}${mm}${aa}`
}

export function formatTimeKey(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${hh}${mi}`
}

export function formatCodeForFilename(format: AdFormat): string {
  return format.replace(':', '')
  // '4:5' → '45', '9:16' → '916', '1:1' → '11'
}

export function buildAdFilename(params: {
  productName: string
  batchCreatedAt: string  // ISO string from DB
  label?: string
  numberInBatch: number   // 1-based
  format: AdFormat
}): string {
  const date = new Date(params.batchCreatedAt)

  const parts: string[] = [
    slugifyProductName(params.productName),
    formatDateKey(date),
    formatTimeKey(date),
  ]

  if (params.label) {
    const slugLabel = slugifyLabel(params.label)
    if (slugLabel) parts.push(slugLabel)
  }

  parts.push(String(params.numberInBatch).padStart(2, '0'))
  parts.push(formatCodeForFilename(params.format))

  return parts.join('_') + '.jpg'
}
