interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  gradient?: boolean
}

export function PageHeader({ title, description, children, gradient = true }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-10 flex-wrap">
      <div>
        <h1
          className={`text-4xl font-extrabold tracking-tighter leading-none ${gradient ? 'text-gradient' : 'text-foreground'}`}
          style={{ letterSpacing: '-0.03em' }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 font-normal tracking-normal">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 mt-1">{children}</div>
      )}
    </div>
  )
}
