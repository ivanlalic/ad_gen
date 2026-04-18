import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar, MobileNav } from "@/components/layout/sidebar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav user={user} />
        <main className="flex-1 overflow-y-auto scroll-smooth bg-mesh">
          {children}
        </main>
      </div>
    </div>
  )
}
