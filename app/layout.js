import './globals.css'
import { AppProvider } from '../context/AppContext'

export const metadata = {
  title: 'Control de Gastos',
  description: 'Sistema de control de gastos diarios',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gastos',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// Script que corre ANTES de React para aplicar el tema guardado
// Evita el flash blanco/negro al cargar la app
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme') || 'system';
      var isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } catch(e) {}
  })();
`

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Tema aplicado antes del primer paint — sin flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
