import { CheckCircle2, Clock, Loader2, AlertCircle, Layers } from 'lucide-react'
const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  queued: { label: 'En cola', icon: <Clock size={9} />, className: 'text-muted-foreground bg-secondary border-border' },
  generating_reviews: { label: 'Reviews...', icon: <Loader2 size={9} className="animate-spin" />, className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  generating_concepts: { label: 'Conceptos...', icon: <Loader2 size={9} className="animate-spin" />, className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  generating_images: { label: 'Imágenes...', icon: <Loader2 size={9} className="animate-spin" />, className: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  done: { label: 'Completo', icon: <CheckCircle2 size={9} />, className: 'text-green-400 bg-green-400/10 border-green-400/20' },
  error: { label: 'Error', icon: <AlertCircle size={9} />, className: 'text-red-400 bg-red-400/10 border-red-400/20' },
}
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP['queued']
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}
