import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: stores } = await supabase.from("stores").select("id").limit(1)

  if (!stores || stores.length === 0) {
    redirect("/onboarding")
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tus batches recientes aparecerán aquí — Fase 2+
      </p>
    </div>
  )
}
