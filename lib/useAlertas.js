'use client'
import { useMemo } from 'react'

/**
 * Motor de alertas.
 * Genera alertas combinando:
 *  1. Gasto vs presupuesto por categoría (N1/N2/total)
 *  2. Gasto vs % de ingresos del mes
 *  3. Patrones inusuales (N1 con gasto > 2x promedio de meses anteriores)
 *
 * Retorna array de alertas ordenadas por severidad.
 * Cada alerta: { id, tipo, severidad, titulo, detalle, valor, limite, pct, categoria }
 */
export function useAlertas({ gastos = [], gastosHistorico = [], ingresos = [], presupuestos = [], from, to } = {}) {

  const alertas = useMemo(() => {
    const result = []

    // ── Helpers ──────────────────────────────────────────────────────────────
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0)
    const totalIngr   = ingresos.reduce((s, i) => s + (i.monto || 0), 0)

    // Gasto por N1
    const porN1 = {}
    gastos.forEach(g => { porN1[g.n1] = (porN1[g.n1] || 0) + (g.monto || 0) })

    // Gasto por N2
    const porN2 = {}
    gastos.forEach(g => {
      if (g.n2) porN2[g.n2] = (porN2[g.n2] || 0) + (g.monto || 0)
    })

    // ── 1. Alertas vs Presupuesto ─────────────────────────────────────────────
    presupuestos.forEach(p => {
      let gastado = 0
      if (p.nivel === 'total')  gastado = totalGastos
      if (p.nivel === 'n1')     gastado = porN1[p.categoria] || 0
      if (p.nivel === 'n2')     gastado = porN2[p.categoria] || 0

      const pct = p.monto > 0 ? Math.round(gastado / p.monto * 100) : 0

      if (pct >= 100) {
        result.push({
          id: `presup-${p.id}-exceso`,
          tipo: 'presupuesto_excedido',
          severidad: 'critica',
          titulo: `Presupuesto excedido: ${p.categoria}`,
          detalle: `Gastaste $${fmt(gastado)} de $${fmt(p.monto)} presupuestados (${pct}%)`,
          valor: gastado, limite: p.monto, pct,
          categoria: p.categoria, nivel: p.nivel,
        })
      } else if (pct >= 80) {
        result.push({
          id: `presup-${p.id}-aviso`,
          tipo: 'presupuesto_cerca',
          severidad: 'advertencia',
          titulo: `Cerca del límite: ${p.categoria}`,
          detalle: `Llevás el ${pct}% del presupuesto ($${fmt(gastado)} de $${fmt(p.monto)})`,
          valor: gastado, limite: p.monto, pct,
          categoria: p.categoria, nivel: p.nivel,
        })
      }
    })

    // ── 2. Alertas vs Ingresos ────────────────────────────────────────────────
    if (totalIngr > 0) {
      const pctGastado = Math.round(totalGastos / totalIngr * 100)

      if (pctGastado >= 100) {
        result.push({
          id: 'ingresos-deficit',
          tipo: 'deficit',
          severidad: 'critica',
          titulo: 'Gastos superan los ingresos',
          detalle: `Gastaste $${fmt(totalGastos)} con ingresos de $${fmt(totalIngr)} (${pctGastado}%)`,
          valor: totalGastos, limite: totalIngr, pct: pctGastado,
          categoria: 'total',
        })
      } else if (pctGastado >= 85) {
        result.push({
          id: 'ingresos-alto',
          tipo: 'ingreso_alto',
          severidad: 'advertencia',
          titulo: `Gastos elevados: ${pctGastado}% de tus ingresos`,
          detalle: `Llevás $${fmt(totalGastos)} gastados de $${fmt(totalIngr)} de ingresos`,
          valor: totalGastos, limite: totalIngr, pct: pctGastado,
          categoria: 'total',
        })
      }
    }

    // ── 3. Patrones inusuales (gasto N1 > 1.8x del promedio histórico) ────────
    if (gastosHistorico.length > 0 && from && to) {
      // Agrupar histórico por mes y N1
      const mesesHist = {}
      gastosHistorico.forEach(g => {
        const mes = g.fecha.slice(0, 7)
        if (!mesesHist[mes]) mesesHist[mes] = {}
        mesesHist[mes][g.n1] = (mesesHist[mes][g.n1] || 0) + (g.monto || 0)
      })

      const mesesArr = Object.values(mesesHist)
      if (mesesArr.length >= 2) {
        const n1s = [...new Set(gastosHistorico.map(g => g.n1).filter(Boolean))]
        n1s.forEach(n1 => {
          const historico = mesesArr.map(m => m[n1] || 0).filter(v => v > 0)
          if (historico.length < 2) return
          const promedio = historico.reduce((s, v) => s + v, 0) / historico.length
          const actual   = porN1[n1] || 0
          if (promedio > 0 && actual > promedio * 1.8) {
            const veces = (actual / promedio).toFixed(1)
            result.push({
              id: `patron-${n1}`,
              tipo: 'patron_inusual',
              severidad: 'info',
              titulo: `Gasto inusual en ${n1}`,
              detalle: `Gastaste $${fmt(actual)}, que es ${veces}x tu promedio mensual ($${fmt(promedio)})`,
              valor: actual, limite: promedio, pct: Math.round(actual / promedio * 100),
              categoria: n1,
            })
          }
        })
      }
    }

    // Ordenar: críticas primero, luego advertencias, luego info
    const orden = { critica: 0, advertencia: 1, info: 2 }
    return result.sort((a, b) => orden[a.severidad] - orden[b.severidad])
  }, [gastos, gastosHistorico, ingresos, presupuestos, from, to])

  return alertas
}

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n || 0)
}

// Colores y emojis por severidad
export const ALERTA_STYLE = {
  critica:     { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: '🚨' },
  advertencia: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '⚠️'  },
  info:        { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📊' },
}
