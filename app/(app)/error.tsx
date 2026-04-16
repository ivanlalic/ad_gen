'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">
        ⚠
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || 'Ocurrió un error inesperado. Intentá de nuevo.'}
        </p>
        {error.digest && (
          <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
            {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Reintentar
        </button>
        <button
          onClick={() => router.push('/stores')}
          className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm border border-border hover:bg-secondary/80 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
