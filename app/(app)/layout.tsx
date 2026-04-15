import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"

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
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {/* Subtle inner gradient on the content area top */}
        <div
          aria-hidden
          className="pointer-events-none sticky top-0 left-0 right-0 h-px z-10"
          style={{ background: 'linear-gradient(90deg, transparent, oklch(0.63 0.22 264 / 0.15), transparent)' }}
        />
        {children}
      </main>
    </div>
  )
}
