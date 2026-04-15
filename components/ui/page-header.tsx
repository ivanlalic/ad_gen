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
        <h1 className={`text-4xl font-bold tracking-tight leading-tight ${gradient ? 'text-gradient' : 'text-foreground'}`}>
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 mt-1">{children}</div>
      )}
    </div>
  )
}
