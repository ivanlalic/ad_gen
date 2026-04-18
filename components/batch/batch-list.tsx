'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Square, CheckSquare, ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { gooeyToast } from '@/components/ui/goey-toaster'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Batch {
  id: string
  status: string
  total_concepts: number
  created_at: string
}

interface BatchListProps {
  batches: Batch[]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} ${hour}:${min}`
}

export function BatchList({ batches }: BatchListProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)

  if (batches.length === 0) return null

  function askDelete(ids: string[]) {
    setPendingDeleteIds(ids)
  }

  const sorted = [...batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allSelected = sorted.length > 0 && selected.size === sorted.length

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(sorted.map((b) => b.id)))

  async function doDelete(ids: string[]) {
    setDeleting((prev) => new Set([...prev, ...ids]))
    try {
      const res = await fetch('/api/batches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSelected(new Set())
      setPendingDeleteIds(null)
      router.refresh()
    } catch (err) {
      gooeyToast.error(`Error al borrar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  const anySelected = selected.size > 0

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden text-sm">
      {/* Bulk action bar */}
      {anySelected && (
        <div className="flex items-center justify-between px-3 py-2 bg-secondary/60 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-400 border-red-400/20 hover:text-red-300 hover:border-red-400/40"
            onClick={() => askDelete([...selected])}
          >
            <Trash2 size={11} />
            Borrar seleccionados
          </Button>
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border">
        {sorted.map((batch) => {
          const isDeleting = deleting.has(batch.id)
          const isSelected = selected.has(batch.id)
          return (
            <div
              key={batch.id}
              className={`flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/20 transition-colors ${isSelected ? 'bg-secondary/30' : ''}`}
            >
              <button
                onClick={() => toggle(batch.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {isSelected
                  ? <CheckSquare size={13} className="text-primary" />
                  : <Square size={13} />
                }
              </button>

              <Link
                href={`/batch/${batch.id}`}
                className="flex-1 flex items-center gap-2.5 min-w-0 group"
              >
                <span className="font-mono text-[11px] text-muted-foreground/70 shrink-0">
                  {batch.id.slice(0, 8)}
                </span>
                <StatusBadge status={batch.status} />
                <span className="text-xs text-muted-foreground shrink-0">
                  {batch.total_concepts} conceptos
                </span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {formatDate(batch.created_at)}
                </span>
                <ExternalLink size={11} className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
              </Link>

              <button
                disabled={isDeleting}
                onClick={() => askDelete([batch.id])}
                className="text-muted-foreground/40 hover:text-red-400 transition-colors shrink-0 disabled:opacity-30"
                title="Borrar batch"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Select all footer */}
      {sorted.length > 1 && (
        <button
          onClick={toggleAll}
          className="w-full flex items-center gap-1.5 px-3 py-2 border-t border-border bg-secondary/10 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          {allSelected
            ? <CheckSquare size={12} className="text-primary" />
            : <Square size={12} />
          }
          {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
        </button>
      )}

      <ConfirmDialog
        open={pendingDeleteIds !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteIds(null) }}
        title={
          pendingDeleteIds
            ? `¿Borrar ${pendingDeleteIds.length === 1 ? 'este batch' : `${pendingDeleteIds.length} batches`}?`
            : '¿Borrar?'
        }
        description="Se eliminarán todos los conceptos e imágenes asociados. Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        variant="destructive"
        loading={pendingDeleteIds ? pendingDeleteIds.some((id) => deleting.has(id)) : false}
        onConfirm={() => { if (pendingDeleteIds) return doDelete(pendingDeleteIds) }}
      />
    </div>
  )
}
