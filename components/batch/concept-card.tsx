'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pin,
} from 'lucide-react'

interface ConceptCardProps {
  concept: {
    id: string
    batch_id: string
    template_number: number | null
    template_name: string | null
    headline: string | null
    body_copy: string | null
    visual_description: string | null
    source_grounding: string
    image_url: string | null
    image_status: string | null
    is_pinned: boolean | null
    nb2_prompt: string | null
  }
  aspectRatio?: string // e.g. '1:1', '4:5', '9:16'
}

const ASPECT_PADDING: Record<string, string> = {
  '1:1': '100%',
  '4:5': '125%',
  '3:4': '133.33%',
  '9:16': '177.78%',
  '16:9': '56.25%',
  '2:3': '150%',
}

export function ConceptCard({ concept, aspectRatio = '1:1' }: ConceptCardProps) {
  const router = useRouter()
  const [copiedHeadline, setCopiedHeadline] = useState(false)
  const [copiedBody, setCopiedBody] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const paddingBottom = ASPECT_PADDING[aspectRatio] ?? '100%'

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

  async function handleRetry() {
    if (isRetrying) return
    setIsRetrying(true)
    try {
      // Reset concept to pending
      await fetch(`/api/concepts/${concept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      })
      // Directly generate this concept
      await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: concept.batch_id, conceptId: concept.id }),
      })
      router.refresh()
    } finally {
      setIsRetrying(false)
    }
  }

  async function handleDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await fetch(`/api/concepts/${concept.id}`, { method: 'DELETE' })
      setDeleted(true)
      setTimeout(() => router.refresh(), 300)
    } catch {
      setIsDeleting(false)
    }
  }

  function renderImageArea() {
    if (concept.image_status === 'done' && concept.image_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={concept.image_url}
          alt={concept.headline ?? 'Concept image'}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )
    }
    if (concept.image_status === 'generating' || isRetrying) {
      return (
        <div className="absolute inset-0 bg-muted animate-pulse flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-[11px] text-muted-foreground">Generando...</span>
        </div>
      )
    }
    if (concept.image_status === 'error') {
      return (
        <div className="absolute inset-0 bg-red-950/30 border border-red-800/20 flex flex-col items-center justify-center gap-1.5">
          <span className="text-red-400 text-2xl">⚠</span>
          <span className="text-[11px] text-red-400">Error al generar</span>
        </div>
      )
    }
    // pending / null
    return (
      <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
        <span className="text-[11px] text-muted-foreground/50">En cola</span>
      </div>
    )
  }

  if (deleted) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      />
    )
  }

  const canDownload = concept.image_status === 'done' && concept.image_url
  const canRetry = concept.image_status === 'error' || concept.image_status === 'pending'

  return (
    <motion.div
      layout
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-colors duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Image area — dynamic aspect ratio */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom }}>
        {renderImageArea()}

        {/* Hover overlay — action buttons */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          {canDownload && (
            <a
              href={concept.image_url!}
              download={`concept-${concept.id.slice(0, 8)}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              title="Descargar imagen"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={15} />
            </a>
          )}
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              title="Reintentar generación"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={isRetrying ? 'animate-spin' : ''} />
            </button>
          )}
          {concept.nb2_prompt && (
            <button
              onClick={() => setShowPrompt((p) => !p)}
              title={showPrompt ? 'Ocultar prompt' : 'Ver prompt NB2'}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors backdrop-blur-sm"
            >
              {showPrompt ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            title="Eliminar concepto"
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-colors backdrop-blur-sm disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {concept.template_number != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
              <span className="opacity-50">#</span>{concept.template_number}
              {concept.template_name ? ` ${concept.template_name}` : ''}
            </span>
          )}
          {concept.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Pin size={9} />
              Anclado
            </span>
          )}
        </div>

        {/* Headline */}
        {concept.headline && (
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            {concept.headline}
          </h3>
        )}

        {/* Body copy */}
        {concept.body_copy && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {concept.body_copy}
          </p>
        )}

        {/* NB2 Prompt expandable */}
        <AnimatePresence>
          {showPrompt && concept.nb2_prompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border">
                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {concept.nb2_prompt}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-2">
          <p className="text-[10px] text-muted-foreground/70 italic line-clamp-2 flex-1">
            {concept.source_grounding}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => concept.headline && copyText(concept.headline, 'headline')}
              disabled={!concept.headline}
              title="Copiar titular"
              className="p-1.5 rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-40"
            >
              {copiedHeadline ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            </button>
            <button
              onClick={() => concept.body_copy && copyText(concept.body_copy, 'body')}
              disabled={!concept.body_copy}
              title="Copiar copy"
              className="p-1.5 rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-40"
            >
              {copiedBody ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
