'use client'

import { useState } from 'react'

interface ConceptCardProps {
  concept: {
    id: string
    template_number: number | null
    template_name: string | null
    headline: string | null
    body_copy: string | null
    visual_description: string | null
    source_grounding: string
    image_url: string | null
    image_status: string | null
    is_pinned: boolean
    nb2_prompt: string | null
  }
}

export function ConceptCard({ concept }: ConceptCardProps) {
  const [copiedHeadline, setCopiedHeadline] = useState(false)
  const [copiedBody, setCopiedBody] = useState(false)

  function copyText(text: string, which: 'headline' | 'body') {
    navigator.clipboard.writeText(text).then(() => {
      if (which === 'headline') {
        setCopiedHeadline(true)
        setTimeout(() => setCopiedHeadline(false), 1500)
      } else {
        setCopiedBody(true)
        setTimeout(() => setCopiedBody(false), 1500)
      }
    })
  }

  function renderImageArea() {
    if (concept.image_status === 'done' && concept.image_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={concept.image_url}
          alt={concept.headline ?? 'Concept image'}
          className="w-full h-full object-cover"
        />
      )
    }

    if (concept.image_status === 'generating') {
      return (
        <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Generando...</span>
        </div>
      )
    }

    if (concept.image_status === 'error') {
      return (
        <div className="w-full h-full bg-red-950/40 border border-red-800/30 flex flex-col items-center justify-center gap-1">
          <span className="text-red-400 text-lg">⚠</span>
          <span className="text-xs text-red-400">Error al generar</span>
        </div>
      )
    }

    // pending or null — static skeleton
    return (
      <div className="w-full h-full bg-muted/40 flex items-center justify-center opacity-50">
        <span className="text-xs text-muted-foreground">En cola</span>
      </div>
    )
  }

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-colors duration-150 hover:border-primary/40">
      {/* Image area */}
      <div className="relative w-full overflow-hidden" style={{ height: '168px' }}>
        {renderImageArea()}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {concept.template_number != null && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
              Template {concept.template_number}
              {concept.template_name ? ` · ${concept.template_name}` : ''}
            </span>
          )}
          {concept.is_pinned && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              Anclado
            </span>
          )}
        </div>

        {/* Headline */}
        {concept.headline && (
          <h3 className="text-base font-semibold text-foreground leading-snug">
            {concept.headline}
          </h3>
        )}

        {/* Body copy */}
        {concept.body_copy && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {concept.body_copy}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-2">
          <p className="text-[10px] text-muted-foreground italic line-clamp-2 flex-1">
            {concept.source_grounding}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => concept.headline && copyText(concept.headline, 'headline')}
              disabled={!concept.headline}
              title="Copiar titular"
              className="px-2 py-1 rounded text-[10px] text-muted-foreground bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-40"
            >
              {copiedHeadline ? '✓' : 'H'}
            </button>
            <button
              onClick={() => concept.body_copy && copyText(concept.body_copy, 'body')}
              disabled={!concept.body_copy}
              title="Copiar cuerpo"
              className="px-2 py-1 rounded text-[10px] text-muted-foreground bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-40"
            >
              {copiedBody ? '✓' : 'B'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
