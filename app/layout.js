// app/layout.js — REEMPLAZÁ tu layout actual con este
import './globals.css'
import { AppProvider } from '../context/AppContext'

export const metadata = {
  title: 'Control de Gastos',
  description: 'Sistema de control de gastos diarios',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gastos',
  },
}

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning evita mismatch por data-theme aplicado en cliente
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
