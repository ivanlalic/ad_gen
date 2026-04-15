export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[oklch(0.09_0.005_264)]">
      {/* Gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 80% 60% at 10% 10%, oklch(0.63 0.22 264 / 0.14) 0%, transparent 60%)',
            'radial-gradient(ellipse 60% 50% at 92% 85%, oklch(0.55 0.22 290 / 0.12) 0%, transparent 55%)',
            'radial-gradient(ellipse 40% 40% at 68% 18%, oklch(0.50 0.18 230 / 0.08) 0%, transparent 50%)',
          ].join(', '),
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
