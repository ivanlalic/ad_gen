'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConceptCard } from '@/components/batch/concept-card'
import { gooeyToast } from '@/components/ui/goey-toaster'
import type { Database } from '@/types/supabase'

type ConceptRow = Database['public']['Tables']['concepts']['Row']

interface BatchViewerProps {
  batch: {
    id: string
    status: string
    generate_images: boolean
    total_concepts: number
    nb2_aspect_ratios: string[]
    products: {
      id: string
      name: string
      hex_primary: string | null
      store_id: string
      stores: { name: string }
    }
  }
  concepts: ConceptRow[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued: { label: 'En cola', color: 'text-muted-foreground' },
  generating_concepts: { label: 'Generando conceptos...', color: 'text-yellow-400' },
  generating_images: { label: 'Generando imágenes...', color: 'text-blue-400' },
  done: { label: 'Completo', color: 'text-green-400' },
  error: { label: 'Error', color: 'text-red-400' },
}

const MAX_RETRIES = 60

export function BatchViewer({ batch, concepts }: BatchViewerProps) {
  const router = useRouter()
  const imageLoopStarted = useRef(false)
  const conceptPollStarted = useRef(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)

  // Poll for concept generation completion
  useEffect(() => {
    if (batch.status !== 'generating_concepts') return
    if (conceptPollStarted.current) return
    conceptPollStarted.current = true

    let retries = 0
    const poll = () => {
      if (retries >= MAX_RETRIES) return
      retries++
      setTimeout(() => {
        router.refresh()
        poll()
      }, 4000)
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
    const doneCount = concepts.filter(c => c.image_status === 'done').length
    const totalImages = concepts.filter(c => c.image_status !== null).length || batch.total_concepts

    const toastId = gooeyToast('Generando imágenes...', {
      duration: Infinity,
      description: `0 / ${totalImages} completadas`,
    })

    setIsGeneratingImages(true)

    async function runLoop(completedSoFar: number) {
      if (retries >= MAX_RETRIES) {
        gooeyToast.update(toastId, {
          title: 'Error',
          description: 'Se alcanzó el límite de reintentos',
          type: 'error',
        })
        setIsGeneratingImages(false)
        return
      }

      retries++

      try {
        const res = await fetch('/api/generate/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: batch.id }),
        })

        if (!res.ok) {
          // Error on this concept — continue loop
          await new Promise(r => setTimeout(r, 1000))
          router.refresh()
          runLoop(completedSoFar)
          return
        }

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
          setIsGeneratingImages(false)
          router.refresh()
          return
        }

        const newCompleted = completedSoFar + 1
        gooeyToast.update(toastId, {
          title: 'Generando imágenes...',
          description: `${newCompleted} / ${totalImages} completadas`,
        })

        await new Promise(r => setTimeout(r, 1000))
        router.refresh()
        runLoop(newCompleted)
      } catch {
        await new Promise(r => setTimeout(r, 1000))
        router.refresh()
        runLoop(completedSoFar)
      }
    }

    runLoop(doneCount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.status, batch.generate_images, batch.id])

  const statusCfg = STATUS_CONFIG[batch.status] ?? { label: batch.status, color: 'text-muted-foreground' }
  const trimmedId = batch.id.slice(0, 8)
  const product = batch.products

  const isLoadingConcepts = batch.status === 'generating_concepts' && concepts.length === 0

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/stores" className="hover:text-foreground transition-colors">
          Tiendas
        </Link>
        <span>/</span>
        <Link href={`/stores/${product.store_id}`} className="hover:text-foreground transition-colors">
          {product.stores.name}
        </Link>
        <span>/</span>
        <Link href={`/stores/${product.store_id}/products/${product.id}`} className="hover:text-foreground transition-colors">
          {product.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-mono">Batch {trimmedId}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Batch de ads</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-sm font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground">
              {concepts.length > 0 ? concepts.length : batch.total_concepts} conceptos
            </span>
          </div>
        </div>
      </div>

      {/* Concept grid */}
      {isLoadingConcepts ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Generando conceptos con Claude...</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="bg-muted/40 animate-pulse" style={{ height: '168px' }} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map(concept => (
            <ConceptCard key={concept.id} concept={concept} />
          ))}
        </div>
      )}
    </div>
  )
}
