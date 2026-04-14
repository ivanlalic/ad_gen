interface Props {
  params: Promise<{ id: string }>
}

export default async function BatchPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Batch</h1>
      <p className="mt-2 text-muted-foreground text-sm font-mono text-xs">{id}</p>
      <p className="mt-1 text-muted-foreground text-sm">
        Batch Viewer con grid de imágenes en tiempo real — Fase 5–6
      </p>
    </div>
  )
}
