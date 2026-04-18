"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"
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

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
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
              active
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            ].join(" ")}
            style={active ? {
              background: 'linear-gradient(90deg, oklch(0.63 0.22 264 / 0.15), oklch(0.63 0.22 264 / 0.05))',
              boxShadow: 'inset 0 0 0 1px oklch(0.63 0.22 264 / 0.2)',
            } : {}}
          >
            {active && (
              <span
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                style={{ background: 'linear-gradient(180deg, oklch(0.75 0.18 264), oklch(0.60 0.22 290))' }}
              />
            )}
            <Icon
              size={15}
              strokeWidth={active ? 2.5 : 1.75}
              className={active ? 'text-primary' : ''}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{
          background: 'linear-gradient(135deg, oklch(0.63 0.22 264), oklch(0.55 0.22 290))',
          boxShadow: '0 0 12px oklch(0.63 0.22 264 / 0.4)',
        }}
      >
        A
      </div>
      <span className="text-foreground font-extrabold tracking-tighter text-sm select-none" style={{ letterSpacing: '-0.04em' }}>
        Ad<span className="text-gradient">Gen</span>
        <span className="text-muted-foreground font-light ml-1.5 text-xs tracking-normal">2.0</span>
      </span>
    </div>
  )
}

function UserFooter({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const avatarLetter = (user.email ?? "U")[0].toUpperCase()
  return (
    <div className="relative px-3 py-3 border-t border-sidebar-border space-y-1">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Avatar size="sm">
          <AvatarFallback
            className="text-[10px] font-semibold"
            style={{
              background: 'linear-gradient(135deg, oklch(0.63 0.22 264 / 0.3), oklch(0.55 0.22 290 / 0.2))',
              color: 'oklch(0.80 0.18 264)',
              border: '1px solid oklch(0.63 0.22 264 / 0.3)',
            }}
          >
            {avatarLetter}
          </AvatarFallback>
        </Avatar>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-150"
      >
        <LogOut size={14} />
        Cerrar sesión
      </button>
    </div>
  )
}

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

  return (
    <aside className="relative w-56 h-full hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 overflow-hidden">
      {/* Subtle top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 120% 80% at 50% -20%, oklch(0.63 0.22 264 / 0.25) 0%, transparent 70%)',
        }}
      />

      <div className="relative px-5 py-5 border-b border-sidebar-border">
        <Logo />
      </div>

      <NavList pathname={pathname} />

      <UserFooter user={user} onSignOut={handleSignOut} />
    </aside>
  )
}

export function MobileNav({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const lastPathname = useRef(pathname)

  // Auto-close drawer when route changes
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
  }, [pathname])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await supabase.auth.signOut()
    gooeyToast("Sesión cerrada")
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* Top bar with hamburger — mobile only */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navegación"
            >
              <div className="relative flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />

              <UserFooter user={user} onSignOut={handleSignOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
