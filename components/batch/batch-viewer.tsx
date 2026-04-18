'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, CheckCircle2, AlertCircle, Clock, WifiOff } from 'lucide-react'
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
    label: 'En cola',
    icon: <Clock size={13} />,
    color: 'text-muted-foreground',
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
  const slowWarningShown = useRef(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [connectionLost, setConnectionLost] = useState(false)

  const aspectRatio = batch.nb2_aspect_ratios?.[0] ?? '1:1'
  const totalImages = concepts.length || batch.total_concepts
  const doneImages = concepts.filter((c) => c.image_status === 'done').length
  const progressPct = totalImages > 0 ? Math.round((imageProgress / totalImages) * 100) : 0

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

    const toastId = gooeyToast('Generando imágenes...', {
      duration: Infinity,
      description: `${completed} / ${totalImages} completadas`,
    })

    setImageProgress(completed)

    async function runLoop() {
      if (retries >= MAX_RETRIES) {
        gooeyToast.update(toastId, {
          title: 'Tiempo agotado',
          description: 'Alcanzado el límite de reintentos',
          type: 'error',
        })
        return
      }
      retries++

      // Soft warning when generation is taking a while (75% of budget)
      if (retries > 60 && !slowWarningShown.current) {
        slowWarningShown.current = true
        gooeyToast('La generación está tardando más de lo normal', {
          duration: 4000,
        })
      }

      try {
        const res = await fetch('/api/generate/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: batch.id }),
        })

        if (!res.ok) {
          setConnectionLost(true)
          await new Promise((r) => setTimeout(r, 1500))
          router.refresh()
          runLoop()
          return
        }

        setConnectionLost(false)

        const data = await res.json() as {
          done?: boolean
          conceptId?: string
          imageUrl?: string
          remainingCount?: number
        }

        if (data.done) {
          gooeyToast.update(toastId, {
            title: '¡Imágenes listas!',
            description: `${totalImages} imágenes generadas`,
            type: 'success',
          })
          setImageProgress(totalImages)
          router.refresh()
          return
        }

        completed += 1
        setImageProgress(completed)
        gooeyToast.update(toastId, {
          title: 'Generando imágenes...',
          description: `${completed} / ${totalImages} completadas`,
        })

        await new Promise((r) => setTimeout(r, 800))
        router.refresh()
        runLoop()
      } catch {
        setConnectionLost(true)
        await new Promise((r) => setTimeout(r, 1500))
        router.refresh()
        runLoop()
      }
    }

    runLoop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.status, batch.generate_images, batch.id])

  async function handleDownloadAll() {
    const withImages = concepts.filter((c) => c.image_status === 'done' && c.image_url)
    if (withImages.length === 0) return
    setIsDownloadingAll(true)
    try {
      for (const concept of withImages) {
        const a = document.createElement('a')
        a.href = concept.image_url!
        a.download = `concept-${concept.id.slice(0, 8)}.jpg`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        await new Promise((r) => setTimeout(r, 200))
      }
    } finally {
      setIsDownloadingAll(false)
    }
  }

  const statusCfg = STATUS_CONFIG[batch.status] ?? { label: batch.status, icon: null, color: 'text-muted-foreground' }
  const product = batch.products
  const isGeneratingImages = batch.status === 'generating_images'
  const isLoadingConcepts = batch.status === 'generating_concepts' && concepts.length === 0
  const hasImages = doneImages > 0

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
      </PageHeader>

      {/* Connection-loss banner */}
      <AnimatePresence>
        {connectionLost && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            role="status"
            className="mb-4 flex items-center gap-2.5 px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-xs"
          >
            <WifiOff size={13} />
            <span className="flex-1">Reintentando conexión…</span>
            <Loader2 size={13} className="animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      {isGeneratingImages && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progreso de imágenes</span>
            <span>{imageProgress} / {totalImages}</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Concept grid */}
      {isLoadingConcepts ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Generando conceptos con Claude...</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: Math.min(Math.max(batch.total_concepts, 3), 12) }).map((_, i) => (
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
