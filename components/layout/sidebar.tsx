"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { LayoutDashboard, Store, Settings, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { gooeyToast } from "@/components/ui/goey-toaster"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SidebarProps {
  user: User
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stores", label: "Tiendas", icon: Store },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    gooeyToast("Sesión cerrada")
    router.push("/login")
    router.refresh()
  }

  const avatarLetter = (user.email ?? "U")[0].toUpperCase()

  return (
    <aside className="w-56 h-full flex flex-col bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <span className="text-foreground font-bold tracking-tight text-base select-none">
          Ad<span className="text-primary">Gen</span>
          <span className="text-muted-foreground font-light ml-1.5 text-xs">2.0</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={[
                "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              ].join(" ")}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
              )}
              <Icon size={15} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
