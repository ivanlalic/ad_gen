import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="border-gradient flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-card/30">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 glow-primary"
        style={{
          background: 'linear-gradient(135deg, oklch(0.63 0.22 264 / 0.2), oklch(0.55 0.22 290 / 0.15))',
          border: '1px solid oklch(0.63 0.22 264 / 0.3)',
        }}
      >
        <Icon size={24} className="text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-7 max-w-xs leading-relaxed">{description}</p>
      )}
      {children}
    </div>
  )
}
