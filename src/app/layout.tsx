import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Anton } from 'next/font/google'

import { AvisoModal } from '@/components/aviso/aviso-modal'
import { Toaster } from '@/components/ui/sonner'
import { EMBLEM_SRC_DARK, EMBLEM_SRC_LIGHT } from '@/lib/brand'

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
  icons: {
    icon: [
      { url: EMBLEM_SRC_LIGHT, media: '(prefers-color-scheme: light)' },
      { url: EMBLEM_SRC_DARK, media: '(prefers-color-scheme: dark)' },
    ],
    apple: EMBLEM_SRC_LIGHT,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#121215' },
  ],
}

// roda antes da pintura: aplica o tema salvo (ou a preferência do sistema)
// pra não piscar branco ao carregar no modo noite.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&m)){document.documentElement.classList.add('dark')}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${anton.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <AvisoModal />
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
