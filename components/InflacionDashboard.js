'use client'
/**
 * InflacionDashboard — Análisis de inflación personal
 *
 * - Multi-usuario: usa auth.uid() via RLS, sin hardcodeo de IDs
 * - Dinámico: detecta el primer y último mes con datos del usuario
 * - Tabla de precios: precio unitario = monto / cantidad (sólo gastos con cantidad > 0)
 * - Proyección: regresión lineal sobre los últimos meses disponibles
 * - Actualiza automáticamente a medida que el usuario carga nuevos gastos
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useChart, PALETTE, baseOptions } from '../lib/useChart'
import { createClient } from '../lib/supabase-browser'

// ── Helpers visuales ─────────────────────────────────────────────────────────
const CAT_COLORS = {
  'Alimentación Básica': '#f59e0b',
  'Servicios':           '#3b82f6',
  'Transporte':          '#10b981',
  'Vivienda':            '#8b5cf6',
  'Salud':               '#ef4444',
  'Limpieza':            '#06b6d4',
  'Ocio':                '#ec4899',
  'Indumentaria':        '#84cc16',
}
const catColor  = c  => CAT_COLORS[c] || '#94a3b8'
const fmt$      = v  => '$' + Math.round(v || 0).toLocaleString('es-AR')
const fmtPct    = v  => (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%'
const fmtAxisK  = v  => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`
const mesLabel  = ym => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${nombres[parseInt(m,10)-1]} ${y.slice(2)}`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16, padding: '18px 20px',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
      display: 'flex', alignItems: 'center', gap: 14, minWidth: 0,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function TabBtn({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
      background: active ? 'var(--accent)' : 'var(--surface2)',
      color: active ? '#fff' : 'var(--text-secondary)',
      boxShadow: active ? '0 2px 10px rgba(59,130,246,.3)' : 'none',
    }}>
      <span>{icon}</span> {label}
    </button>
  )
}

// ── Líneas: variación % desde el primer mes con datos ────────────────────────
function LinePrecios({ rawData, meses, productos }) {
  const datasets = useMemo(() => productos.map((prod, i) => {
    const rows       = rawData.filter(r => r.producto_norm === prod)
    const sortedRows = [...rows].sort((a,b) => a.mes.localeCompare(b.mes))
    const baseRow    = sortedRows[0]
    const base       = baseRow?.precio_unit ?? null
    return {
      label: rawData.find(r => r.producto_norm === prod)?.producto || prod,
      data: meses.map(m => {
        const r = rows.find(x => x.mes === m)
        return (r && base) ? ((r.precio_unit - base) / base * 100) : null
      }),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '18',
      borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
      tension: 0.35, fill: false, spanGaps: true,
    }
  }), [rawData, meses, productos])

  const canvasRef = useChart('line', (theme) => ({
    data: { labels: meses.map(mesLabel), datasets },
    options: {
      ...baseOptions(theme),
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtPct(ctx.parsed.y)}` } },
        legend: { display: true, position: 'bottom', labels: { color: theme.textColor, font: { size: 11 }, boxWidth: 12, padding: 12 } },
      },
      scales: {
        x: { ticks: { color: theme.textColor, font: { size: 11 } }, grid: { color: theme.gridColor } },
        y: { ticks: { color: theme.textColor, font: { size: 11 }, callback: v => fmtPct(v) }, grid: { color: theme.gridColor } },
      },
    }
  }), [datasets, meses])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

// ── Barras horizontales: inflación acumulada por categoría ───────────────────
function BarCategorias({ inflPorCat, meses }) {
  const sorted = [...inflPorCat].sort((a, b) => b.acum - a.acum)
  const canvasRef = useChart('bar', (theme) => ({
    data: {
      labels: sorted.map(d => d.cat),
      datasets: [{
        label: `Acumulada ${mesLabel(meses[0])}→${mesLabel(meses[meses.length-1])}`,
        data: sorted.map(d => d.acum),
        backgroundColor: sorted.map(d => catColor(d.cat) + 'cc'),
        borderColor: sorted.map(d => catColor(d.cat)),
        borderWidth: 2, borderRadius: 8,
      }]
    },
    options: {
      ...baseOptions(theme),
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmtPct(ctx.parsed.x)}` } },
      },
      scales: {
        x: { ticks: { color: theme.textColor, font: { size: 11 }, callback: v => fmtPct(v) }, grid: { color: theme.gridColor } },
        y: { ticks: { color: theme.textColor, font: { size: 12, weight: '600' } }, grid: { display: false } },
      },
    }
  }), [sorted, meses])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

// ── Líneas: gasto mensual total / fijos / variables ───────────────────────────
function LineGastoTotal({ gastoMensual, meses }) {
  const canvasRef = useChart('line', (theme) => ({
    data: {
      labels: meses.map(mesLabel),
      datasets: [
        { label: 'Total', data: gastoMensual.map(d => d.total), borderColor: '#3b82f6', backgroundColor: '#3b82f620', borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 5, pointHoverRadius: 7 },
        { label: 'Fijos', data: gastoMensual.map(d => d.fijos), borderColor: '#8b5cf6', backgroundColor: 'transparent', borderWidth: 2, borderDash: [4,3], tension: 0.35, pointRadius: 3 },
        { label: 'Variables', data: gastoMensual.map(d => d.variables), borderColor: '#f59e0b', backgroundColor: 'transparent', borderWidth: 2, borderDash: [4,3], tension: 0.35, pointRadius: 3 },
      ],
    },
    options: {
      ...baseOptions(theme),
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: theme.textColor, font: { size: 11 }, boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt$(ctx.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: theme.textColor, font: { size: 11 } }, grid: { color: theme.gridColor } },
        y: { ticks: { color: theme.textColor, font: { size: 11 }, callback: fmtAxisK }, grid: { color: theme.gridColor } },
      },
    }
  }), [gastoMensual, meses])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

// ── Tabla de precios ──────────────────────────────────────────────────────────
function TablaProductos({ rawData, meses, filtroCategoria, ordenar }) {
  const productos = useMemo(() => {
    const map = {}
    for (const r of rawData) {
      const key = r.producto_norm
      if (!map[key]) map[key] = { producto: r.producto, categoria: r.categoria, data: {} }
      map[key].data[r.mes] = r.precio_unit
    }
    return Object.values(map)
      .filter(p => {
        if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false
        return Object.keys(p.data).length >= 2
      })
      .map(p => {
        const mesesP = Object.keys(p.data).sort()
        const base   = p.data[mesesP[0]] || 0
        const ultimo = p.data[mesesP[mesesP.length-1]] || 0
        const acum   = base ? (ultimo - base) / base * 100 : 0
        const mensual = meses.slice(1).map((m, i) => {
          const prev = p.data[meses[i]]
          const curr = p.data[m]
          return (prev && curr) ? (curr - prev) / prev * 100 : null
        })
        return { ...p, base, ultimo, acum, mensual }
      })
      .sort((a, b) => ordenar === 'acum' ? b.acum - a.acum : a.producto.localeCompare(b.producto))
  }, [rawData, meses, filtroCategoria, ordenar])

  const mesesMensual = meses.slice(1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {[
              'Producto', 'Categoría',
              mesLabel(meses[0]), mesLabel(meses[meses.length-1]),
              'Acum.',
              ...mesesMensual.map(m => mesLabel(m))
            ].map((h, i) => (
              <th key={i} style={{ padding: '7px 9px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {productos.slice(0, 60).map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '8px 9px', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.producto}</td>
              <td style={{ padding: '8px 9px' }}>
                <span style={{ background: catColor(p.categoria) + '22', color: catColor(p.categoria), borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{p.categoria || '—'}</span>
              </td>
              <td style={{ padding: '8px 9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt$(p.base)}</td>
              <td style={{ padding: '8px 9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt$(p.ultimo)}</td>
              <td style={{ padding: '8px 9px', fontWeight: 800, whiteSpace: 'nowrap',
                color: p.acum > 40 ? '#ef4444' : p.acum > 20 ? '#f59e0b' : '#10b981' }}>
                {fmtPct(p.acum)}
              </td>
              {p.mensual.map((v, mi) => (
                <td key={mi} style={{ padding: '8px 9px', fontWeight: 600, whiteSpace: 'nowrap',
                  color: v === null ? 'var(--text-muted)' : v > 6 ? '#ef4444' : v > 3 ? '#f59e0b' : '#10b981' }}>
                  {v === null ? '—' : fmtPct(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {productos.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Sin datos para esta categoría</div>
      )}
    </div>
  )
}

// ── Proyección ────────────────────────────────────────────────────────────────
function Proyeccion({ gastoMensual, meses }) {
  const proyeccion = useMemo(() => {
    if (gastoMensual.length < 3) return null
    const puntos = gastoMensual.slice(-Math.min(6, gastoMensual.length)).filter(d => d.total > 0)
    if (puntos.length < 2) return null
    const n  = puntos.length
    const xs = puntos.map((_, i) => i)
    const ys = puntos.map(d => d.total)
    const sumX  = xs.reduce((s,v) => s+v, 0)
    const sumY  = ys.reduce((s,v) => s+v, 0)
    const sumXY = xs.reduce((s,v,i) => s + v*ys[i], 0)
    const sumX2 = xs.reduce((s,v) => s + v*v, 0)
    const denom = (n*sumX2 - sumX*sumX)
    const slope = denom ? (n*sumXY - sumX*sumY) / denom : 0
    const intercept = (sumY - slope*sumX) / n

    const ultimoMes = meses[meses.length - 1]
    const [y, m] = ultimoMes.split('-').map(Number)
    const futuros = [1,2,3].map(i => {
      const d = new Date(y, m - 1 + i)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    })
    const base = ys[ys.length - 1]
    return futuros.map((mes, i) => ({
      mes, label: mesLabel(mes),
      valor: Math.max(0, Math.round(intercept + slope * (n - 1 + i + 1))),
      pct: base ? ((Math.round(intercept + slope * (n - 1 + i + 1)) - base) / base * 100) : 0,
    }))
  }, [gastoMensual, meses])

  if (!proyeccion) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
      Se necesitan al menos 3 meses de datos para proyectar
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {proyeccion.map((p, i) => (
          <div key={i} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{fmt$(p.valor)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: p.pct > 10 ? '#ef4444' : p.pct > 5 ? '#f59e0b' : '#10b981' }}>
              {fmtPct(p.pct)} vs {mesLabel(meses[meses.length-1])}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Proyección por regresión lineal sobre los últimos {Math.min(6, gastoMensual.filter(d => d.total > 0).length)} meses
      </p>
    </div>
  )
}

// ── Ranking productos más inflados ───────────────────────────────────────────
function RankingInflacion({ rawData, meses }) {
  const ranking = useMemo(() => {
    const map = {}
    for (const r of rawData) {
      if (!map[r.producto_norm]) map[r.producto_norm] = { producto: r.producto, categoria: r.categoria, data: {} }
      map[r.producto_norm].data[r.mes] = r.precio_unit
    }
    return Object.values(map)
      .filter(p => Object.keys(p.data).length >= 2)
      .map(p => {
        const mesesP   = Object.keys(p.data).sort()
        const primerM  = mesesP[0]
        const ultimoM  = mesesP[mesesP.length - 1]
        return {
          producto: p.producto, categoria: p.categoria,
          acum: (p.data[ultimoM] - p.data[primerM]) / p.data[primerM] * 100,
          base: p.data[primerM], final: p.data[ultimoM],
        }
      })
      .sort((a, b) => b.acum - a.acum)
      .slice(0, 12)
  }, [rawData, meses])

  if (!ranking.length) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Sin datos suficientes</p>

  const maxAcum = ranking[0].acum

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ranking.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, width: 24, textAlign: 'center', flexShrink: 0 }}>
            {i < 3 ? ['🥇','🥈','🥉'][i] : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{i+1}</span>}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.producto}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.categoria} · {fmt$(p.base)} → {fmt$(p.final)}</div>
          </div>
          <div style={{ position: 'relative', width: 100, height: 6, background: 'var(--border)', borderRadius: 3, flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3, width: `${(p.acum / maxAcum) * 100}%`, background: p.acum > 40 ? '#ef4444' : p.acum > 25 ? '#f59e0b' : '#10b981' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, minWidth: 52, textAlign: 'right', flexShrink: 0, color: p.acum > 40 ? '#ef4444' : p.acum > 25 ? '#f59e0b' : '#10b981' }}>
            {fmtPct(p.acum)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function InflacionDashboard() {
  const [tab, setTab]                         = useState('resumen')
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)
  const [rawData, setRawData]                 = useState([])
  const [gastoMensual, setGastoMensual]       = useState([])
  const [meses, setMeses]                     = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [ordenarTabla, setOrdenarTabla]       = useState('acum')
  const [productosSelec, setProductosSelec]   = useState([])

  const supabase = createClient()

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1) Rango dinámico desde los datos reales del usuario (RLS filtra por auth.uid())
      const [{ data: rInicio }, { data: rFin }] = await Promise.all([
        supabase.from('gastos').select('fecha').order('fecha', { ascending: true  }).limit(1),
        supabase.from('gastos').select('fecha').order('fecha', { ascending: false }).limit(1),
      ])

      if (!rInicio?.length || !rFin?.length) { setLoading(false); return }

      const mesInicio  = rInicio[0].fecha.substring(0, 7)
      const hoy        = new Date().toISOString().substring(0, 7)
      const mesFin     = rFin[0].fecha.substring(0, 7) > hoy ? hoy : rFin[0].fecha.substring(0, 7)

      // Generar array de meses en el rango
      const mesesRango = []
      let cur = new Date(mesInicio + '-01')
      const fin = new Date(mesFin + '-01')
      while (cur <= fin) {
        mesesRango.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`)
        cur.setMonth(cur.getMonth() + 1)
      }
      setMeses(mesesRango)

      // 2) Gastos con cantidad > 0 para calcular precios unitarios reales
      const { data: gastosConCantidad, error: eGC } = await supabase
        .from('gastos')
        .select('n4, n2, fecha, monto, cantidad, n1')
        .gte('fecha', mesInicio + '-01')
        .lte('fecha', mesFin   + '-31')
        .in('n1', ['Variables', 'Fijos'])
        .gt('cantidad', 0)
      if (eGC) throw eGC

      // Agrupar por producto normalizado + mes → precio unitario promedio
      const mapaPrecios = {}
      for (const r of gastosConCantidad || []) {
        const mes  = r.fecha.substring(0, 7)
        const prod = (r.n4 || '').trim()
        if (!prod) continue
        const key = prod.toLowerCase() + '__' + mes
        if (!mapaPrecios[key]) mapaPrecios[key] = {
          producto: prod, producto_norm: prod.toLowerCase(),
          categoria: r.n2 || '', mes, montoSum: 0, cantSum: 0,
        }
        mapaPrecios[key].montoSum += Number(r.monto)
        mapaPrecios[key].cantSum  += Number(r.cantidad)
      }
      const preciosArr = Object.values(mapaPrecios)
        .filter(g => g.cantSum > 0)
        .map(g => ({ ...g, precio_unit: Math.round(g.montoSum / g.cantSum) }))
      setRawData(preciosArr)

      // Selección inicial: top 5 productos más frecuentes
      const freq = {}
      for (const r of preciosArr) freq[r.producto_norm] = (freq[r.producto_norm] || 0) + 1
      const top5 = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k]) => k)
      setProductosSelec(top5)

      // 3) Gasto total mensual (todos los gastos, para el resumen)
      const { data: todosGastos, error: eTG } = await supabase
        .from('gastos')
        .select('fecha, monto, n1')
        .gte('fecha', mesInicio + '-01')
        .lte('fecha', mesFin   + '-31')
      if (eTG) throw eTG

      const mapaGasto = {}
      for (const r of todosGastos || []) {
        const mes = r.fecha.substring(0, 7)
        if (!mapaGasto[mes]) mapaGasto[mes] = { mes, total: 0, fijos: 0, variables: 0 }
        mapaGasto[mes].total += Number(r.monto)
        if (r.n1 === 'Fijos')     mapaGasto[mes].fijos     += Number(r.monto)
        if (r.n1 === 'Variables') mapaGasto[mes].variables += Number(r.monto)
      }
      setGastoMensual(mesesRango.map(m => mapaGasto[m] || { mes: m, total: 0, fijos: 0, variables: 0 }))

    } catch (err) {
      console.error('InflacionDashboard:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // ── Cálculos derivados ─────────────────────────────────────────────────────
  const { kpis, inflPorCat, categorias, todosProductos } = useMemo(() => {
    if (!rawData.length || meses.length < 2) return { kpis: {}, inflPorCat: [], categorias: [], todosProductos: [] }

    const primero = meses[0]
    const ultimo  = meses[meses.length - 1]

    const mapaProds = {}
    for (const r of rawData) {
      if (!mapaProds[r.producto_norm]) mapaProds[r.producto_norm] = { ...r, porMes: {} }
      mapaProds[r.producto_norm].porMes[r.mes] = r.precio_unit
    }

    const inflCat = {}
    for (const p of Object.values(mapaProds)) {
      const mesesP = Object.keys(p.porMes).sort()
      if (mesesP.length < 2) continue
      const acum = (p.porMes[mesesP[mesesP.length-1]] - p.porMes[mesesP[0]]) / p.porMes[mesesP[0]] * 100
      const cat  = p.categoria || 'Sin categoría'
      if (!inflCat[cat]) inflCat[cat] = []
      inflCat[cat].push(acum)
    }

    const inflPorCat = Object.entries(inflCat)
      .map(([cat, vals]) => ({ cat, acum: vals.reduce((s,v) => s+v, 0) / vals.length }))
      .filter(c => c.acum > 0)
      .sort((a, b) => b.acum - a.acum)

    const categorias     = ['todas', ...new Set(rawData.map(r => r.categoria).filter(Boolean).sort())]
    const todosProductos = [...new Set(rawData.map(r => r.producto_norm))]

    const inflGeneral  = inflPorCat.length ? inflPorCat.reduce((s,c) => s+c.acum, 0) / inflPorCat.length : 0
    const masInflada   = inflPorCat[0]
    const menosInflada = inflPorCat[inflPorCat.length - 1]
    const totalUltimo  = gastoMensual.find(g => g.mes === ultimo)?.total  || 0
    const totalPrimero = gastoMensual.find(g => g.mes === primero)?.total || 0
    const varGasto     = totalPrimero ? (totalUltimo - totalPrimero) / totalPrimero * 100 : 0

    return {
      kpis: { inflGeneral, masInflada, menosInflada, totalUltimo, totalPrimero, varGasto, primero, ultimo },
      inflPorCat, categorias, todosProductos,
    }
  }, [rawData, meses, gastoMensual])

  const toggleProducto = pn => setProductosSelec(prev =>
    prev.includes(pn) ? prev.filter(x => x !== pn) : prev.length < 8 ? [...prev, pn] : prev
  )

  // ── Render: estados especiales ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>Analizando historial de precios…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>⚠️ {error}</p>
      <button onClick={cargarDatos} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Reintentar</button>
    </div>
  )

  if (meses.length === 0) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
      <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sin gastos registrados aún.</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>El análisis se activa automáticamente cuando cargues gastos con cantidad.</p>
    </div>
  )

  if (meses.length < 2) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
      <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Se necesitan al menos 2 meses de datos.</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Tenés datos desde {mesLabel(meses[0])}. Seguí registrando y el análisis se activa solo.</p>
    </div>
  )

  const pLabel = mesLabel(kpis.primero || meses[0])
  const uLabel = mesLabel(kpis.ultimo  || meses[meses.length-1])

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: 20, padding: '22px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(59,130,246,.08)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Análisis Personal · Precios Reales</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>📈 Inflación en mis Gastos</h2>
            <p style={{ color: '#64748b', margin: '5px 0 0', fontSize: 12 }}>
              {pLabel} → {uLabel} · {meses.length} {meses.length === 1 ? 'mes' : 'meses'}
            </p>
          </div>
          <button onClick={cargarDatos} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard label={`Inflación prom. ${pLabel}→${uLabel}`} value={fmtPct(kpis.inflGeneral || 0)} sub={`${rawData.length > 0 ? new Set(rawData.map(r => r.producto_norm)).size : 0} productos medidos`} color="#f59e0b" icon="🔥" />
        <KPICard label="Categoría más afectada" value={kpis.masInflada?.cat || '—'} sub={kpis.masInflada ? fmtPct(kpis.masInflada.acum) + ' acum.' : 'Sin datos'} color="#ef4444" icon="📈" />
        <KPICard label={`Gasto ${uLabel}`} value={fmt$(kpis.totalUltimo)} sub={`${fmtPct(kpis.varGasto || 0)} vs ${pLabel}`} color="#3b82f6" icon="💸" />
        <KPICard label="Más estable" value={kpis.menosInflada?.cat || '—'} sub={kpis.menosInflada ? fmtPct(kpis.menosInflada.acum) + ' acum.' : 'Sin datos'} color="#10b981" icon="✅" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <TabBtn id="resumen"    label="Resumen"       icon="📊" active={tab==='resumen'}    onClick={setTab} />
        <TabBtn id="productos"  label="Precios"       icon="🏷️" active={tab==='productos'}  onClick={setTab} />
        <TabBtn id="tabla"      label="Tabla precios" icon="📋" active={tab==='tabla'}      onClick={setTab} />
        <TabBtn id="proyeccion" label="Proyección"    icon="🔮" active={tab==='proyeccion'} onClick={setTab} />
      </div>

      {/* ══ RESUMEN ══ */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>📊 Inflación acumulada por categoría</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>{pLabel} → {uLabel}</p>
            <div style={{ height: Math.max(200, inflPorCat.length * 40) }}>
              {inflPorCat.length > 0
                ? <BarCategorias inflPorCat={inflPorCat} meses={meses} />
                : <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Registrá gastos con cantidad para ver inflación por categoría</p>}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>💸 Gasto mensual — Total · Fijos · Variables</h3>
            <div style={{ height: 240 }}><LineGastoTotal gastoMensual={gastoMensual} meses={meses} /></div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>📅 Detalle mensual</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Mes','Total','Fijos','Variables','Var. mensual'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {gastoMensual.map((g, i) => {
                    const prev = i > 0 ? gastoMensual[i-1].total : null
                    const vari = prev ? (g.total - prev) / prev * 100 : null
                    return (
                      <tr key={g.mes} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{mesLabel(g.mes)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#3b82f6' }}>{fmt$(g.total)}</td>
                        <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>{fmt$(g.fijos)}</td>
                        <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{fmt$(g.variables)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: vari === null ? 'var(--text-muted)' : vari > 10 ? '#ef4444' : vari > 5 ? '#f59e0b' : '#10b981' }}>
                          {vari === null ? '—' : fmtPct(vari)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ PRECIOS ══ */}
      {tab === 'productos' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>🏷️ Evolución de precios unitarios</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>Variación % desde primer registro de cada producto. Hasta 8.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, maxHeight: 130, overflowY: 'auto', paddingBottom: 4 }}>
            {todosProductos.map(pn => {
              const label = rawData.find(r => r.producto_norm === pn)?.producto || pn
              return (
                <button key={pn} onClick={() => toggleProducto(pn)} style={{
                  padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all .1s',
                  border: `1.5px solid ${productosSelec.includes(pn) ? 'var(--accent)' : 'var(--border)'}`,
                  background: productosSelec.includes(pn) ? 'var(--accent-light)' : 'var(--surface2)',
                  color: productosSelec.includes(pn) ? 'var(--accent)' : 'var(--text-secondary)',
                }}>{label}</button>
              )
            })}
          </div>
          <div style={{ height: 320 }}>
            {productosSelec.length > 0
              ? <LinePrecios rawData={rawData} meses={meses} productos={productosSelec} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Seleccioná productos arriba</div>}
          </div>
        </div>
      )}

      {/* ══ TABLA ══ */}
      {tab === 'tabla' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>📋 Tabla de precios unitarios</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
            Precio = monto ÷ cantidad. Base {pLabel} → último {uLabel}.
          </p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Cat:</span>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)} style={{
                padding: '4px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: filtroCategoria === cat ? (cat === 'todas' ? 'var(--accent)' : catColor(cat)) : 'var(--surface2)',
                color: filtroCategoria === cat ? '#fff' : 'var(--text-secondary)',
              }}>{cat === 'todas' ? 'Todas' : cat}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Orden:</span>
            {['acum','nombre'].map(o => (
              <button key={o} onClick={() => setOrdenarTabla(o)} style={{
                padding: '4px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: ordenarTabla === o ? 'var(--accent)' : 'var(--surface2)',
                color: ordenarTabla === o ? '#fff' : 'var(--text-secondary)',
              }}>{o === 'acum' ? '↓ Inflación' : 'A→Z'}</button>
            ))}
          </div>
          <TablaProductos rawData={rawData} meses={meses} filtroCategoria={filtroCategoria} ordenar={ordenarTabla} />
        </div>
      )}

      {/* ══ PROYECCIÓN ══ */}
      {tab === 'proyeccion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>🔮 Proyección de gasto total</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Próximos 3 meses según tendencia histórica</p>
            <Proyeccion gastoMensual={gastoMensual} meses={meses} />
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>🏷️ Ranking — Productos más inflados</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>{pLabel} → {uLabel}</p>
            <RankingInflacion rawData={rawData} meses={meses} />
          </div>
        </div>
      )}

    </div>
  )
}
