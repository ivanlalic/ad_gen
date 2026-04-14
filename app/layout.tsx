import type { Metadata } from "next"
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google"
import { GooeyToaster } from "@/components/ui/goey-toaster"
import "./globals.css"

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "AdGen 2.0",
  description: "Generador de anuncios estáticos para Meta con IA",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`dark ${bricolage.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <GooeyToaster position="bottom-right" theme="dark" />
      </body>
    </html>
  )
}
