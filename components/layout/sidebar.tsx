"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { AnimatePresence, motion } from "framer-motion"
import { LayoutDashboard, Store, Settings, LogOut, Menu, X } from "lucide-react"
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

function SidebarContent({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    gooeyToast("Sesión cerrada")
    onNavigate?.()
    router.push("/login")
    router.refresh()
  }

  const avatarLetter = (user.email ?? "U")[0].toUpperCase()

  return (
    <div className="relative h-full flex flex-col bg-sidebar overflow-hidden">
      {/* Subtle top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -20%, oklch(0.63 0.22 264 / 0.25) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div className="relative px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.63 0.22 264), oklch(0.55 0.22 290))",
              boxShadow: "0 0 12px oklch(0.63 0.22 264 / 0.4)",
            }}
          >
            A
          </div>
          <span
            className="text-foreground font-extrabold tracking-tighter text-sm select-none"
            style={{ letterSpacing: "-0.04em" }}
          >
            Ad<span className="text-gradient">Gen</span>
            <span className="text-muted-foreground font-light ml-1.5 text-xs tracking-normal">
              2.0
            </span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={[
                "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                active
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              ].join(" ")}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(90deg, oklch(0.63 0.22 264 / 0.15), oklch(0.63 0.22 264 / 0.05))",
                      boxShadow: "inset 0 0 0 1px oklch(0.63 0.22 264 / 0.2)",
                    }
                  : {}
              }
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, oklch(0.75 0.18 264), oklch(0.60 0.22 290))",
                  }}
                />
              )}
              <Icon
                size={15}
                strokeWidth={active ? 2.5 : 1.75}
                className={active ? "text-primary" : ""}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="relative px-3 py-3 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar size="sm">
            <AvatarFallback
              className="text-[10px] font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.63 0.22 264 / 0.3), oklch(0.55 0.22 290 / 0.2))",
                color: "oklch(0.80 0.18 264)",
                border: "1px solid oklch(0.63 0.22 264 / 0.3)",
              }}
            >
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="hidden lg:flex relative w-56 h-full border-r border-sidebar-border shrink-0">
      <SidebarContent user={user} />
    </aside>
  )
}

export function MobileNav({ user }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer when route changes (covers browser back/forward; clicks already close via onNavigate)
  const lastPathname = useRef(pathname)
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
  }, [pathname])

  // Lock scroll when open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      {/* Topbar (mobile only) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-12 border-b border-sidebar-border bg-sidebar/90 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Menu size={18} />
        </button>
        <div
          className="flex items-center gap-2 text-foreground font-extrabold tracking-tighter text-sm select-none"
          style={{ letterSpacing: "-0.04em" }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.63 0.22 264), oklch(0.55 0.22 290))",
            }}
          >
            A
          </div>
          Ad<span className="text-gradient">Gen</span>
        </div>
        <span className="w-9" />
      </header>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navegación"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="absolute top-0 left-0 bottom-0 w-64 border-r border-sidebar-border shadow-xl"
            >
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <X size={16} />
              </button>
              <SidebarContent user={user} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
