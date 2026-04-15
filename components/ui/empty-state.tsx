import { type LucideIcon } from 'lucide-react'
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
}
export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-card/20">
      <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
        <Icon size={22} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mb-6 max-w-xs">{description}</p>}
      {children}
    </div>
  )
}
