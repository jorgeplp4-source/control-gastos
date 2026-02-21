import './globals.css'

export const metadata = {
  title: 'Control de Gastos',
  description: 'Sistema de control de gastos diarios',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
