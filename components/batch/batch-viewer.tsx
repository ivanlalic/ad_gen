'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, Trash2, Pencil, Check, X, ImageOff } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ConceptCard } from '@/components/batch/concept-card'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Database } from '@/types/supabase'
import { buildAdFilename } from '@/lib/naming'
import type { AdFormat } from '@/lib/ad-formats'
import { updateBatchLabel } from '@/lib/actions/batches'

type ConceptRow = Database['public']['Tables']['concepts']['Row']

interface BatchViewerProps {
  batch: {
    id: string
    status: string
    generate_images: boolean
    total_concepts: number
    nb2_aspect_ratios: string[] | null
    nb2_model: string | null
    created_at: string
    label: string | null
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
  const [isGenerating916All, setIsGenerating916All] = useState(false)
  const [gen916Progress, setGen916Progress] = useState(0)
  const [labelEditing, setLabelEditing] = useState(false)
  const [labelValue, setLabelValue] = useState(batch.label ?? '')
  const [labelSaving, setLabelSaving] = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [connectionLost, setConnectionLost] = useState(false)
  const slowWarnedRef = useRef(false)
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDownloading, setBulkDownloading] = useState(false)

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

    // Start polling immediately — batch status flips to generating_concepts
    // in the API before streaming starts, but React props still show 'queued'.
    // Without this, concepts only appear all at once when the fetch resolves.
    conceptPollStarted.current = true
    let fetchDone = false
    let retries = 0
    const poll = () => {
      if (fetchDone || retries >= MAX_RETRIES) return
      retries++
      setTimeout(() => { router.refresh(); poll() }, 1500)
    }
    setTimeout(poll, 1500) // first poll after API has had time to flip status

    fetch('/api/generate/concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        productId: batch.products?.id,
        totalConcepts: batch.total_concepts,
      }),
    }).then(async (res) => {
      fetchDone = true
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        gooeyToast.error(err.error || 'Error generando conceptos')
      }
      setGenerationStep(null)
      router.refresh()
    }).catch(() => {
      fetchDone = true
      gooeyToast.error('Error de conexión generando conceptos')
      setGenerationStep(null)
      router.refresh()
    })
  }, [batch.status, batch.id, batch.products?.id, batch.total_concepts, router])

  // Poll for concept generation (page loaded mid-generation)
  useEffect(() => {
    if (batch.status !== 'generating_concepts') return
    if (conceptPollStarted.current) return
    conceptPollStarted.current = true

    let retries = 0
    const poll = () => {
      if (retries >= MAX_RETRIES) return
      retries++
      setTimeout(() => { router.refresh(); poll() }, 1500)
    }
    poll()
  }, [batch.status, router])

  // Connection-loss banner: listen to browser online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateOnline = () => setConnectionLost(!window.navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

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

      // Soft warning when polling is well past the comfort zone (75% of cap)
      if (retries > Math.floor(MAX_RETRIES * 0.75) && !slowWarnedRef.current) {
        slowWarnedRef.current = true
        gooeyToast('La generación está tardando más de lo normal', { duration: 6000 })
      }

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
        // Successful round-trip: clear connection banner if it was up
        setConnectionLost(false)

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
        // Network failure → show banner and back off; loop will keep trying
        setConnectionLost(true)
        await new Promise((r) => setTimeout(r, 1500))
        runLoop()
      }
    }

    runLoop()
    return () => { if (elapsedInterval.current) clearInterval(elapsedInterval.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.status, batch.generate_images, batch.id])

  function toggleSelectConcept(id: string) {
    setSelectedConcepts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllConcepts() {
    setSelectedConcepts(new Set(concepts.map((c) => c.id)))
  }

  function clearSelection() {
    setSelectedConcepts(new Set())
  }

  async function handleBulkDelete() {
    if (selectedConcepts.size === 0 || bulkDeleting) return
    setBulkDeleting(true)
    const ids = [...selectedConcepts]
    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/concepts/${id}`, { method: 'DELETE' }).catch(() => null))
      )
      setSelectedConcepts(new Set())
      setConfirmBulkDelete(false)
      gooeyToast.success(`${ids.length} concepto${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}`)
      router.refresh()
    } catch (err) {
      gooeyToast.error(`Error al borrar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleBulkDownload() {
    if (selectedConcepts.size === 0 || bulkDownloading) return
    const primaryFormat = (batch.nb2_aspect_ratios?.[0] ?? '4:5') as AdFormat
    const productName = product?.name ?? 'ad'
    const batchCreatedAt = batch.created_at
    const batchLabel = batch.label ?? undefined

    type DownloadTask = { filename: string; url: string }
    const tasks: DownloadTask[] = []
    concepts.forEach((concept, i) => {
      if (!selectedConcepts.has(concept.id)) return
      const numberInBatch = i + 1
      const base = { productName, batchCreatedAt, label: batchLabel, numberInBatch }
      if (concept.image_status === 'done' && concept.image_url) {
        tasks.push({ filename: buildAdFilename({ ...base, format: primaryFormat }), url: concept.image_url })
      }
      if (concept.image_url_9_16 && primaryFormat !== '9:16') {
        tasks.push({ filename: buildAdFilename({ ...base, format: '9:16' }), url: concept.image_url_9_16 })
      }
      if (concept.image_url_1_1 && primaryFormat !== '1:1') {
        tasks.push({ filename: buildAdFilename({ ...base, format: '1:1' }), url: concept.image_url_1_1 })
      }
    })
    if (tasks.length === 0) {
      gooeyToast('Ninguno de los seleccionados tiene imagen generada')
      return
    }

    setBulkDownloading(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const CONCURRENCY = 6
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async (task) => {
          try {
            const res = await fetch(task.url)
            if (!res.ok) return
            zip.file(task.filename, await res.blob())
          } catch { /* skip failed */ }
        }))
      }
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const url = URL.createObjectURL(content)
      const now = new Date()
      const stamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`
      const a = document.createElement('a')
      a.href = url
      a.download = `adgen_seleccion_${stamp}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setBulkDownloading(false)
    }
  }

  async function handleSaveLabel() {
    setLabelSaving(true)
    try {
      await updateBatchLabel(batch.id, labelValue)
      setLabelEditing(false)
    } catch {
      gooeyToast.error('Error al guardar nombre')
    } finally {
      setLabelSaving(false)
    }
  }

  // Concepts that have the primary image done but no 9:16 variant yet
  const needs916 = concepts.filter((c) => c.image_status === 'done' && c.image_url && !c.image_url_9_16)

  async function handleGenerateAll916() {
    if (needs916.length === 0 || isGenerating916All) return
    setIsGenerating916All(true)
    setGen916Progress(0)

    for (const c of needs916) {
      try {
        await fetch('/api/generate/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: batch.id, conceptId: c.id, aspectRatio: '9:16' }),
        })
      } catch {
        // skip failed, continue
      }
      setGen916Progress((p) => p + 1)
    }

    setIsGenerating916All(false)
    router.refresh()
  }

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
    setIsDeleting(true)
    try {
      const res = await fetch('/api/batches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: [batch.id] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setConfirmDelete(false)
      router.push(product ? `/stores/${product.store_id}` : '/stores')
    } catch (err) {
      gooeyToast.error(`Error al borrar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      setIsDeleting(false)
    }
  }

  async function handleDownloadAll() {
    const primaryFormat = (batch.nb2_aspect_ratios?.[0] ?? '4:5') as AdFormat
    const productName = product?.name ?? 'ad'
    const batchCreatedAt = batch.created_at
    const batchLabel = batch.label ?? undefined

    // Collect all variants across all concepts
    type DownloadTask = { filename: string; url: string }
    const tasks: DownloadTask[] = []
    concepts.forEach((concept, i) => {
      const numberInBatch = i + 1
      const base = { productName, batchCreatedAt, label: batchLabel, numberInBatch }
      if (concept.image_status === 'done' && concept.image_url) {
        tasks.push({ filename: buildAdFilename({ ...base, format: primaryFormat }), url: concept.image_url })
      }
      if (concept.image_url_9_16 && primaryFormat !== '9:16') {
        tasks.push({ filename: buildAdFilename({ ...base, format: '9:16' }), url: concept.image_url_9_16 })
      }
      if (concept.image_url_1_1 && primaryFormat !== '1:1') {
        tasks.push({ filename: buildAdFilename({ ...base, format: '1:1' }), url: concept.image_url_1_1 })
      }
    })
    if (tasks.length === 0) return

    setIsDownloadingAll(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const CONCURRENCY = 6
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        await Promise.all(tasks.slice(i, i + CONCURRENCY).map(async (task) => {
          try {
            const res = await fetch(task.url)
            if (!res.ok) return
            zip.file(task.filename, await res.blob())
          } catch { /* skip failed */ }
        }))
      }

      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const aa = String(now.getFullYear()).slice(-2)
      const hh = String(now.getHours()).padStart(2, '0')
      const mi = String(now.getMinutes()).padStart(2, '0')
      const zipName = `adgen_${dd}${mm}${aa}_${hh}${mi}.zip`

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = zipName
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

      {/* Batch label — editable inline */}
      <div className="flex items-center gap-2 mb-4">
        {labelEditing ? (
          <>
            <input
              ref={labelInputRef}
              autoFocus
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLabel()
                if (e.key === 'Escape') { setLabelEditing(false); setLabelValue(batch.label ?? '') }
              }}
              placeholder="Nombre del batch..."
              className="px-2 py-1 bg-input border border-primary/40 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 w-52"
            />
            <button
              type="button"
              onClick={handleSaveLabel}
              disabled={labelSaving}
              className="p-1 rounded text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
            >
              {labelSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              type="button"
              onClick={() => { setLabelEditing(false); setLabelValue(batch.label ?? '') }}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => { setLabelEditing(true); setTimeout(() => labelInputRef.current?.focus(), 0) }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            {labelValue ? (
              <span className="font-medium text-foreground">{labelValue}</span>
            ) : (
              <span className="italic opacity-40">Sin nombre — click para editar</span>
            )}
          </button>
        )}
      </div>

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
        {batch.status === 'done' && needs916.length > 0 && (
          <Button
            onClick={handleGenerateAll916}
            disabled={isGenerating916All}
            variant="outline"
            size="sm"
          >
            {isGenerating916All ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {gen916Progress}/{needs916.length} 9:16...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Generar todas en 9:16 ({needs916.length})
              </>
            )}
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
          onClick={() => setConfirmDelete(true)}
          disabled={isDeleting}
          variant="outline"
          size="sm"
          className="text-red-400 hover:text-red-300 border-red-400/20 hover:border-red-400/40"
        >
          <Trash2 size={14} />
          {isDeleting ? 'Borrando...' : 'Borrar batch'}
        </Button>
      </PageHeader>

      {/* Connection-loss banner */}
      {connectionLost && (
        <div className="mb-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
          <Loader2 size={13} className="animate-spin shrink-0" />
          <span className="text-xs">Reintentando conexión…</span>
        </div>
      )}

      {/* Bulk selection bar — sticky, appears when at least one concept is selected */}
      {selectedConcepts.size > 0 && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-xl border border-primary/30 bg-popover/90 backdrop-blur-md shadow-lg shadow-black/30">
          <span className="text-sm font-medium text-foreground">
            {selectedConcepts.size} seleccionado{selectedConcepts.size !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            de {concepts.length}
          </span>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {selectedConcepts.size < concepts.length && (
              <Button onClick={selectAllConcepts} variant="ghost" size="sm">
                Seleccionar todos ({concepts.length})
              </Button>
            )}
            <Button
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              variant="outline"
              size="sm"
            >
              <Download size={13} />
              {bulkDownloading ? 'Zip...' : 'Descargar'}
            </Button>
            <Button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleting}
              variant="outline"
              size="sm"
              className="text-red-400 hover:text-red-300 border-red-400/20 hover:border-red-400/40"
            >
              <Trash2 size={13} />
              Borrar
            </Button>
            <Button onClick={clearSelection} variant="ghost" size="sm" aria-label="Cancelar selección">
              <X size={13} />
            </Button>
          </div>
        </div>
      )}

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
        batch.status === 'done' || batch.status === 'error' ? (
          <EmptyState
            icon={ImageOff}
            title="Este batch no tiene conceptos"
            description="No se generaron conceptos o fueron eliminados. Creá un batch nuevo para seguir."
          >
            <Link
              href={product ? `/batch/new?productId=${product.id}` : '/stores'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Crear batch nuevo
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: Math.min(batch.total_concepts || 6, 12) }).map((_, i) => (
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
        )
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
              <ConceptCard
                concept={concept}
                aspectRatio={aspectRatio}
                format={aspectRatio as any}
                batchMeta={{
                  createdAt: batch.created_at,
                  productName: product?.name ?? 'ad',
                  label: batch.label ?? undefined,
                  indexInBatch: i + 1,
                }}
                isSelected={selectedConcepts.has(concept.id)}
                selectionMode={selectedConcepts.size > 0}
                onToggleSelect={() => toggleSelectConcept(concept.id)}
                generationMode={(batch as any).generation_mode ?? undefined}
              />
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Borrar este batch?"
        description="Se eliminarán todos los conceptos e imágenes generados. Esta acción no se puede deshacer."
        confirmLabel="Borrar batch"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`¿Borrar ${selectedConcepts.size} concepto${selectedConcepts.size !== 1 ? 's' : ''}?`}
        description="Se eliminarán los conceptos seleccionados y sus imágenes. Esta acción no se puede deshacer."
        confirmLabel={`Borrar ${selectedConcepts.size}`}
        variant="destructive"
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
