'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { ConceptCard } from '@/components/batch/concept-card'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Database } from '@/types/supabase'

type ConceptRow = Database['public']['Tables']['concepts']['Row']

interface BatchViewerProps {
  batch: {
    id: string
    status: string
    generate_images: boolean
    total_concepts: number
    nb2_aspect_ratios: string[] | null
    nb2_model: string | null
    products: {
      id: string
      name: string
      hex_primary: string | null
      store_id: string
      stores: { name: string } | null
    } | null
  }
  concepts: ConceptRow[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  queued: {
    label: 'Iniciando...',
    icon: <Loader2 size={13} className="animate-spin" />,
    color: 'text-yellow-400',
  },
  generating_concepts: {
    label: 'Generando conceptos...',
    icon: <Loader2 size={13} className="animate-spin" />,
    color: 'text-yellow-400',
  },
  generating_images: {
    label: 'Generando imágenes...',
    icon: <Loader2 size={13} className="animate-spin" />,
    color: 'text-blue-400',
  },
  done: {
    label: 'Completo',
    icon: <CheckCircle2 size={13} />,
    color: 'text-green-400',
  },
  error: {
    label: 'Error',
    icon: <AlertCircle size={13} />,
    color: 'text-red-400',
  },
}

const MAX_RETRIES = 80

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
}

export function BatchViewer({ batch, concepts }: BatchViewerProps) {
  const router = useRouter()
  const imageLoopStarted = useRef(false)
  const conceptPollStarted = useRef(false)
  const conceptGenerationStarted = useRef(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [currentGeneratingLabel, setCurrentGeneratingLabel] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [stalled, setStalled] = useState(false)
  const lastProgressTime = useRef<number>(Date.now())
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string | null>(null)

  const aspectRatio = batch.nb2_aspect_ratios?.[0] ?? '1:1'
  const totalImages = concepts.length || batch.total_concepts
  const doneImages = concepts.filter((c) => c.image_status === 'done').length
  const progressPct = totalImages > 0 ? Math.round((imageProgress / totalImages) * 100) : 0

  // Trigger concept generation when batch is queued
  useEffect(() => {
    if (batch.status !== 'queued') return
    if (conceptGenerationStarted.current) return
    conceptGenerationStarted.current = true

    setGenerationStep('Generando conceptos con Claude...')

    fetch('/api/generate/concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        productId: batch.products?.id,
        totalConcepts: batch.total_concepts,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        gooeyToast.error(err.error || 'Error generando conceptos')
      }
      setGenerationStep(null)
      router.refresh()
    }).catch(() => {
      gooeyToast.error('Error de conexión generando conceptos')
      setGenerationStep(null)
      router.refresh()
    })
  }, [batch.status, batch.id, batch.products?.id, batch.total_concepts, router])

  // Poll for concept generation
  useEffect(() => {
    if (batch.status !== 'generating_concepts') return
    if (conceptPollStarted.current) return
    conceptPollStarted.current = true

    let retries = 0
    const poll = () => {
      if (retries >= MAX_RETRIES) return
      retries++
      setTimeout(() => { router.refresh(); poll() }, 4000)
    }
    poll()
  }, [batch.status, router])

  // Image generation loop
  useEffect(() => {
    if (batch.status !== 'generating_images') return
    if (!batch.generate_images) return
    if (imageLoopStarted.current) return
    imageLoopStarted.current = true

    let retries = 0
    let completed = doneImages
    const startTime = Date.now()
    lastProgressTime.current = Date.now()

    setImageProgress(completed)
    setStalled(false)

    // Elapsed time ticker
    elapsedInterval.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
      if (Date.now() - lastProgressTime.current > 90_000) setStalled(true)
    }, 1000)

    async function runLoop() {
      if (retries >= MAX_RETRIES) {
        clearInterval(elapsedInterval.current!)
        setCurrentGeneratingLabel(null)
        gooeyToast.error('Tiempo agotado — límite de reintentos alcanzado')
        return
      }
      retries++

      try {
        // Refresh BEFORE the call so the previous concept shows as done
        router.refresh()

        const res = await fetch('/api/generate/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: batch.id }),
        })

        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 1500))
          runLoop()
          return
        }

        const data = await res.json() as {
          done?: boolean
          targetConceptId?: string
          imageUrl?: string
          remainingCount?: number
        }

        if (data.done) {
          clearInterval(elapsedInterval.current!)
          setCurrentGeneratingLabel(null)
          setImageProgress(totalImages)
          router.refresh()
          return
        }

        // Find concept headline for the label
        const conceptLabel = concepts.find(c => c.id === data.targetConceptId)
          ? (concepts.find(c => c.id === data.targetConceptId)?.headline ?? null)
          : null

        completed += 1
        lastProgressTime.current = Date.now()
        setStalled(false)
        setImageProgress(completed)
        setCurrentGeneratingLabel(conceptLabel)

        await new Promise((r) => setTimeout(r, 300))
        runLoop()
      } catch {
        await new Promise((r) => setTimeout(r, 1500))
        runLoop()
      }
    }

    runLoop()
    return () => { if (elapsedInterval.current) clearInterval(elapsedInterval.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.status, batch.generate_images, batch.id])

  async function handleRegenerateImages() {
    setIsRegenerating(true)
    try {
      const res = await fetch('/api/batches/regenerate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      // Reset the loop ref so it can restart when status becomes generating_images
      imageLoopStarted.current = false
      router.refresh()
    } catch (err) {
      gooeyToast.error(`Error al regenerar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Borrar este batch y todos sus conceptos? Esta acción no se puede deshacer.')) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/batches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: [batch.id] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      router.push(product ? `/stores/${product.store_id}` : '/stores')
    } catch (err) {
      gooeyToast.error(`Error al borrar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      setIsDeleting(false)
    }
  }

  async function handleDownloadAll() {
    const withImages = concepts.filter((c) => c.image_status === 'done' && c.image_url)
    if (withImages.length === 0) return
    setIsDownloadingAll(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const productName = (product?.name ?? 'ad')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 30)

      await Promise.all(
        withImages.map(async (concept, i) => {
          const res = await fetch(concept.image_url!)
          const blob = await res.blob()
          const ext = blob.type.includes('jpeg') ? 'jpg' : 'png'
          const num = String(i + 1).padStart(2, '0')
          zip.file(`${productName}_${num}.${ext}`, blob)
        })
      )

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${productName}_ads.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloadingAll(false)
    }
  }

  const statusCfg = STATUS_CONFIG[batch.status] ?? { label: batch.status, icon: null, color: 'text-muted-foreground' }
  const product = batch.products
  const isGeneratingImages = batch.status === 'generating_images'
  const isLoadingConcepts = (batch.status === 'generating_concepts' || batch.status === 'queued') && concepts.length === 0
  const hasImages = doneImages > 0
  const errorImages = concepts.filter((c) => c.image_status === 'error').length
  const canRegenerateImages = batch.generate_images && errorImages > 0 && !isGeneratingImages

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/stores" className="hover:text-foreground transition-colors">
          Tiendas
        </Link>
        <span className="opacity-40">/</span>
        {product && (
          <>
            <Link href={`/stores/${product.store_id}`} className="hover:text-foreground transition-colors">
              {product.stores?.name ?? 'Tienda'}
            </Link>
            <span className="opacity-40">/</span>
            <Link href={`/stores/${product.store_id}`} className="hover:text-foreground transition-colors">
              {product.name}
            </Link>
            <span className="opacity-40">/</span>
          </>
        )}
        <span className="text-foreground font-mono text-xs bg-secondary px-2 py-0.5 rounded-md">
          Batch {batch.id.slice(0, 8)}
        </span>
      </nav>

      {/* Header */}
      <PageHeader
        title="Batch de ads"
        description={`${concepts.length > 0 ? concepts.length : batch.total_concepts} conceptos${batch.status === 'done' ? ` · ${doneImages} imágenes` : ''}`}
      >
        <StatusBadge status={batch.status} />
        {canRegenerateImages && (
          <Button
            onClick={handleRegenerateImages}
            disabled={isRegenerating}
            variant="outline"
            size="sm"
          >
            <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
            {isRegenerating ? 'Reiniciando...' : `Regenerar imágenes (${errorImages})`}
          </Button>
        )}
        {hasImages && (
          <Button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            variant="outline"
            size="sm"
          >
            <Download size={14} />
            {isDownloadingAll ? 'Descargando...' : `Descargar todo (${doneImages})`}
          </Button>
        )}
        <Button
          onClick={handleDelete}
          disabled={isDeleting}
          variant="outline"
          size="sm"
          className="text-red-400 hover:text-red-300 border-red-400/20 hover:border-red-400/40"
        >
          <Trash2 size={14} />
          {isDeleting ? 'Borrando...' : 'Borrar batch'}
        </Button>
      </PageHeader>

      {/* Progress bar */}
      {isGeneratingImages && (
        <div className="mb-8 p-4 bg-card border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              <span className="text-sm font-medium text-foreground">
                Generando imágenes — {imageProgress} / {totalImages}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {currentGeneratingLabel && (
            <p className="text-xs text-muted-foreground">
              Última completada: <span className="text-foreground">{currentGeneratingLabel}</span>
            </p>
          )}
          {stalled && (
            <p className="text-xs text-yellow-400">
              ⚠ Sin progreso en más de 90s — puede haber un error en una imagen. Las demás seguirán generando.
            </p>
          )}
          {!stalled && imageProgress === 0 && elapsedSeconds > 15 && (
            <p className="text-xs text-muted-foreground/60">
              Generando primera imagen... ~15-30s por imagen
            </p>
          )}
        </div>
      )}

      {/* Concept grid */}
      {isLoadingConcepts ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">
            {generationStep ?? 'Generando conceptos con Claude...'}
          </p>
          <p className="text-xs text-muted-foreground/60">Esto puede tardar hasta 60 segundos</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
              <div className="animate-pulse bg-muted/40" style={{ paddingBottom: '100%' }} />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-muted/40 animate-pulse rounded w-1/3" />
                <div className="h-4 bg-muted/40 animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted/40 animate-pulse rounded w-full" />
                <div className="h-3 bg-muted/40 animate-pulse rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map((concept, i) => (
            <motion.div
              key={concept.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <ConceptCard concept={concept} aspectRatio={aspectRatio} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
