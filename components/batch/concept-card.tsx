'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  RefreshCw,
  Trash2,
  Eye,
  Copy,
  Check,
  Pin,
  Wand2,
  ImagePlus,
  X,
} from 'lucide-react'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

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
    image_url_9_16: string | null
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
  const [showImageModal, setShowImageModal] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(concept.nb2_prompt ?? '')
  const [correctionText, setCorrectionText] = useState('')
  const [correctionImage, setCorrectionImage] = useState<{ base64: string; mime: string; name: string } | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false)
  const correctionFileRef = useRef<HTMLInputElement>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isGenerating916, setIsGenerating916] = useState(false)
  const [imageUrl916, setImageUrl916] = useState<string | null>(concept.image_url_9_16)
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
      const patchRes = await fetch(`/api/concepts/${concept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(err.error || `Error resetting concept (${patchRes.status})`)
      }

      // Generate this concept
      const genRes = await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: concept.batch_id, conceptId: concept.id }),
      })
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}))
        throw new Error(err.error || `Error generando imagen (${genRes.status})`)
      }

      router.refresh()
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al regenerar imagen')
    } finally {
      setIsRetrying(false)
    }
  }

  async function handleRegenerateWithChanges(editMode: boolean) {
    if (isRegenerating) return
    setIsRegenerating(true)
    try {
      if (!editMode && editedPrompt !== (concept.nb2_prompt ?? '')) {
        // Save edited prompt if changed (only in from-scratch mode)
        const patchRes = await fetch(`/api/concepts/${concept.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-prompt', nb2Prompt: editedPrompt }),
        })
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}))
          throw new Error(err.error || 'Error guardando prompt')
        }
      }

      // Generate image with overrides
      const genRes = await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: concept.batch_id,
          conceptId: concept.id,
          editFromExisting: editMode,
          promptOverride: editMode ? undefined : (editedPrompt || undefined),
          correctionText: correctionText || undefined,
          correctionImageBase64: correctionImage?.base64 || undefined,
          correctionImageMime: correctionImage?.mime || undefined,
        }),
      })
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}))
        throw new Error(err.error || 'Error al regenerar')
      }

      setCorrectionText('')
      setCorrectionImage(null)
      router.refresh()
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al regenerar')
    } finally {
      setIsRegenerating(false)
    }
  }

  function handleCorrectionImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const [header, base64] = dataUrl.split(',')
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      setCorrectionImage({ base64, mime, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate916() {
    if (isGenerating916) return
    setIsGenerating916(true)
    try {
      const res = await fetch('/api/generate/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: concept.batch_id, conceptId: concept.id, aspectRatio: '9:16' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error generando 9:16 (${res.status})`)
      }
      const data = await res.json()
      if (data.imageUrl916) setImageUrl916(data.imageUrl916)
      router.refresh()
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Error al generar 9:16')
    } finally {
      setIsGenerating916(false)
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
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={concept.image_url}
            alt={concept.headline ?? 'Concept image'}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {isRegenerating && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-[11px] text-white/80">Editando...</span>
            </div>
          )}
        </>
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
          {canDownload && (
            <button
              onClick={() => setShowImageModal(true)}
              title="Ver imagen grande"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors backdrop-blur-sm"
            >
              <Eye size={15} />
            </button>
          )}
          {canDownload && (
            <button
              onClick={handleGenerate916}
              disabled={isGenerating916}
              title="Generar versión 9:16"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors backdrop-blur-sm disabled:opacity-50 text-[11px] font-medium leading-none"
            >
              {isGenerating916 ? (
                <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
              ) : (
                '9:16'
              )}
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

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground/70 italic line-clamp-2">
              {concept.source_grounding}
            </p>
            {concept.nb2_prompt && (
              <button
                type="button"
                onClick={() => setShowPrompt((p) => !p)}
                className="mt-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {showPrompt ? '▲ Ocultar prompt' : '▼ Ver prompt'}
              </button>
            )}
          </div>
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

        {/* 9:16 thumbnail */}
        <AnimatePresence>
          {imageUrl916 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 pt-2 border-t border-border"
            >
              <span className="text-[10px] text-muted-foreground/60 shrink-0">9:16</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl916}
                alt="9:16 version"
                className="h-12 w-auto rounded object-cover border border-border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(imageUrl916!, '_blank')}
              />
              <a
                href={imageUrl916}
                download={`concept-${concept.id.slice(0, 8)}-9x16.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={11} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt panel — edit image or regenerate from scratch */}
        <AnimatePresence>
          {showPrompt && concept.nb2_prompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border mt-2">
                {concept.image_status === 'done' && !showAdvancedPrompt ? (
                  /* ── EDIT IMAGE MODE (default when image exists) ── */
                  <>
                    <p className="text-[10px] text-muted-foreground/70">
                      Describí el cambio. La imagen existente se manda a Gemini junto con tu corrección.
                    </p>
                    <input
                      type="text"
                      placeholder="Ej: agrega badge '4x1', cambia fondo a blanco, quita la persona..."
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      className="w-full text-[10px] text-muted-foreground bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                    />

                    {/* Optional reference image */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => correctionFileRef.current?.click()}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ImagePlus size={11} />
                        {correctionImage ? correctionImage.name : 'Imagen de referencia (opcional)'}
                      </button>
                      {correctionImage && (
                        <button
                          type="button"
                          onClick={() => { setCorrectionImage(null); if (correctionFileRef.current) correctionFileRef.current.value = '' }}
                          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X size={11} />
                        </button>
                      )}
                      <input ref={correctionFileRef} type="file" accept="image/*" className="hidden" onChange={handleCorrectionImagePick} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRegenerateWithChanges(true)}
                      disabled={isRegenerating}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                      {isRegenerating ? <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" /> : <Wand2 size={11} />}
                      {isRegenerating ? 'Aplicando...' : 'Aplicar edición'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedPrompt(true)}
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors text-center"
                    >
                      ⚙ Regenerar desde cero (editar prompt)
                    </button>
                  </>
                ) : (
                  /* ── FROM SCRATCH MODE (edit nb2_prompt + regenerate) ── */
                  <>
                    {concept.image_status === 'done' && (
                      <button
                        type="button"
                        onClick={() => setShowAdvancedPrompt(false)}
                        className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors text-left"
                      >
                        ← Volver a editar imagen
                      </button>
                    )}
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      rows={5}
                      className="w-full text-[10px] text-muted-foreground font-mono leading-relaxed bg-background border border-border rounded p-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <input
                      type="text"
                      placeholder="Corrección adicional (opcional)"
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      className="w-full text-[10px] text-muted-foreground bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => correctionFileRef.current?.click()}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ImagePlus size={11} />
                        {correctionImage ? correctionImage.name : 'Imagen de referencia'}
                      </button>
                      {correctionImage && (
                        <button
                          type="button"
                          onClick={() => { setCorrectionImage(null); if (correctionFileRef.current) correctionFileRef.current.value = '' }}
                          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X size={11} />
                        </button>
                      )}
                      <input ref={correctionFileRef} type="file" accept="image/*" className="hidden" onChange={handleCorrectionImagePick} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRegenerateWithChanges(false)}
                      disabled={isRegenerating}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                      {isRegenerating ? <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" /> : <Wand2 size={11} />}
                      {isRegenerating ? 'Regenerando...' : 'Regenerar desde cero'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-[90vw] w-fit max-h-[92vh] p-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">{concept.headline ?? 'Imagen del concepto'}</DialogTitle>
          {concept.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={concept.image_url}
              alt={concept.headline ?? 'Concept image'}
              className="block max-h-[80vh] w-auto object-contain"
            />
          )}
          {concept.headline && (
            <div className="px-4 py-3 shrink-0">
              <p className="text-sm font-semibold text-foreground">{concept.headline}</p>
              {concept.body_copy && (
                <p className="text-xs text-muted-foreground mt-1">{concept.body_copy}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
