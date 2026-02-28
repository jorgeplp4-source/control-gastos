'use client'
import { useEffect, useRef } from 'react'
import {
  Chart,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  DoughnutController, BarController, LineController,
} from 'chart.js'

// Registro único de todos los componentes Chart.js que vamos a usar
Chart.register(
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  DoughnutController, BarController, LineController,
)

// Paleta de colores consistente con el resto del proyecto
export const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1',
]

// Tema claro/oscuro para los ejes y labels
export function getChartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  return {
    textColor:   isDark ? '#94a3b8' : '#64748b',
    gridColor:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    bgColor:     isDark ? '#1e293b' : '#ffffff',
  }
}

// Opciones base comunes a todos los gráficos
export function baseOptions(theme) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: {
          color: theme.textColor,
          font: { family: 'inherit', size: 12, weight: '600' },
          boxWidth: 12, boxHeight: 12, borderRadius: 4,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: theme.bgColor,
        titleColor: theme.textColor,
        bodyColor: theme.textColor,
        borderColor: theme.gridColor,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: { weight: '700', size: 13 },
        bodyFont: { size: 13 },
        boxPadding: 4,
      },
    },
  }
}

/**
 * Hook principal — maneja creación, actualización y destrucción del chart.
 * Uso: const canvasRef = useChart(type, data, options)
 */
export function useChart(type, getData, getDeps = []) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const theme = getChartTheme()
    const { data, options } = getData(theme)

    // Destruir instancia anterior si existe
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(canvasRef.current, { type, data, options })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, getDeps) // eslint-disable-line react-hooks/exhaustive-deps

  return canvasRef
}
