import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Anton } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

const anton = Anton({
  variable: '--font-display',
  weight: '400',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Bolão Copa 2026',
  description: 'Bolão da Copa do Mundo FIFA 2026 entre amigos',
}

export const viewport: Viewport = {
  themeColor: '#f4f0e8',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
