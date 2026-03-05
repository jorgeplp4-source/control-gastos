'use client'
import { useState, useMemo, useEffect } from 'react'
import { useChart, PALETTE, baseOptions, getChartTheme } from '../lib/useChart'
import { createClient } from '../lib/supabase-browser'

// ── Colores por categoría ────────────────────────────────────────────────────
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
const catColor = (cat) => CAT_COLORS[cat] || '#94a3b8'

const MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago']
const MESES_FULL = ['2026-03','2026-04','2026-05','2026-06','2026-07','2026-08']
const fmt$ = v => '$' + Math.round(v).toLocaleString('es-AR')
const fmtPct = v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
const fmtAxis = v => v >= 1000000 ? `$${(v/1e6).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`

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
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Gráfico líneas: evolución precios productos ───────────────────────────────
function LinePrecios({ data, productos }) {
  const datasets = useMemo(() => productos.map((prod, i) => {
    const rows = data.filter(r => r.producto === prod)
    const base = rows[0]?.precio_unit || 1
    return {
      label: prod,
      data: MESES_FULL.map(m => {
        const r = rows.find(x => x.mes === m)
        return r ? ((r.precio_unit - base) / base * 100) : null
      }),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '20',
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: false,
      spanGaps: true,
    }
  }), [data, productos])

  const canvasRef = useChart('line', (theme) => ({
    data: { labels: MESES, datasets },
    options: {
      ...baseOptions(theme),
      plugins: {
        ...baseOptions(theme).plugins,
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${fmtPct(ctx.parsed.y)}`,
          }
        },
        legend: { display: true, position: 'bottom', labels: { color: theme.textColor, font: { size: 11 }, boxWidth: 12, padding: 12 } },
      },
      scales: {
        x: { ticks: { color: theme.textColor, font: { size: 11 } }, grid: { color: theme.gridColor } },
        y: {
          ticks: { color: theme.textColor, font: { size: 11 }, callback: v => fmtPct(v) },
          grid: { color: theme.gridColor },
        },
      },
    }
  }), [datasets])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

// ── Gráfico barras: inflación acumulada por categoría ─────────────────────────
function BarCategorias({ inflPorCat }) {
  const sorted = [...inflPorCat].sort((a,b) => b.acum - a.acum)
  const canvasRef = useChart('bar', (theme) => ({
    data: {
      labels: sorted.map(d => d.cat),
      datasets: [{
        label: 'Inflación acumulada Mar→Ago',
        data: sorted.map(d => d.acum),
        backgroundColor: sorted.map(d => catColor(d.cat) + 'cc'),
        borderColor: sorted.map(d => catColor(d.cat)),
        borderWidth: 2,
        borderRadius: 8,
      }]
    },
    options: {
      ...baseOptions(theme),
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmtPct(ctx.parsed.x)}` } }
      },
      scales: {
        x: {
          ticks: { color: theme.textColor, font: { size: 11 }, callback: v => fmtPct(v) },
          grid: { color: theme.gridColor },
        },
        y: { ticks: { color: theme.textColor, font: { size: 12, weight: '600' } }, grid: { display: false } },
      },
    }
  }), [sorted])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

// ── Gráfico líneas: gasto total mensual ───────────────────────────────────────
function LineGastoTotal({ gastoMensual }) {
  const canvasRef = useChart('line', (theme) => ({
    data: {
      labels: MESES,
      datasets: [
        {
          label: 'Gasto total',
          data: gastoMensual.map(d => d.total),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f620',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Fijos',
          data: gastoMensual.map(d => d.fijos),
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4,3],
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Variables',
          data: gastoMensual.map(d => d.variables),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4,3],
          tension: 0.35,
          pointRadius: 3,
        },
      ]
    },
    options: {
      ...baseOptions(theme),
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: theme.textColor, font: { size: 11 }, boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt$(ctx.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: theme.textColor, font: { size: 11 } }, grid: { color: theme.gridColor } },
        y: { ticks: { color: theme.textColor, font: { size: 11 }, callback: fmtAxis }, grid: { color: theme.gridColor } },
      },
    }
  }), [gastoMensual])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

// ── Tabla productos con su inflación ─────────────────────────────────────────
function TablaProductos({ data, filtroCategoria }) {
  const [orden, setOrden] = useState('acum')

  const productos = useMemo(() => {
    // Agrupar por producto normalizado
    const map = {}
    for (const r of data) {
      const key = r.producto.toLowerCase().trim()
      if (!map[key]) map[key] = { producto: r.producto, categoria: r.categoria, meses: {} }
      map[key].meses[r.mes] = Number(r.precio_unit)
    }
    return Object.values(map)
      .filter(p => {
        if (filtroCategoria !== 'todas') return p.categoria === filtroCategoria
        return true
      })
      .map(p => {
        const precios = MESES_FULL.map(m => p.meses[m]).filter(Boolean)
        if (precios.length < 2) return null
        const base = precios[0]
        const ultimo = precios[precios.length - 1]
        const acum = (ultimo - base) / base * 100
        // mes a mes
        const mensual = []
        for (let i = 1; i < MESES_FULL.length; i++) {
          const prev = p.meses[MESES_FULL[i-1]]
          const curr = p.meses[MESES_FULL[i]]
          if (prev && curr) mensual.push((curr - prev) / prev * 100)
          else mensual.push(null)
        }
        const avgMensual = mensual.filter(Boolean).reduce((s,v) => s+v, 0) / mensual.filter(Boolean).length
        return { ...p, acum, mensual, avgMensual, base, ultimo }
      })
      .filter(Boolean)
      .sort((a, b) => orden === 'acum' ? b.acum - a.acum : a.producto.localeCompare(b.producto))
  }, [data, filtroCategoria, orden])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Ordenar:</span>
        {['acum', 'nombre'].map(o => (
          <button key={o} onClick={() => setOrden(o)}
            style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: orden === o ? 'var(--accent)' : 'var(--surface2)',
              color: orden === o ? '#fff' : 'var(--text-secondary)' }}>
            {o === 'acum' ? 'Mayor inflación' : 'Nombre'}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['Producto','Categoría','Precio Mar','Precio Ago','Acum 6m','Abr','May','Jun','Jul','Ago'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productos.slice(0, 40).map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.producto}</td>
                <td style={{ padding: '9px 10px' }}>
                  <span style={{ background: catColor(p.categoria) + '25', color: catColor(p.categoria), borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{p.categoria || '—'}</span>
                </td>
                <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{fmt$(p.base)}</td>
                <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{fmt$(p.ultimo)}</td>
                <td style={{ padding: '9px 10px', fontWeight: 700,
                  color: p.acum > 30 ? '#ef4444' : p.acum > 20 ? '#f59e0b' : '#10b981' }}>
                  {fmtPct(p.acum)}
                </td>
                {p.mensual.map((v, mi) => (
                  <td key={mi} style={{ padding: '9px 10px', color: v === null ? 'var(--text-muted)' : v > 5 ? '#ef4444' : v > 3 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
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
    </div>
  )
}

// ── Proyección 3 meses ────────────────────────────────────────────────────────
function Proyeccion({ gastoMensual }) {
  if (gastoMensual.length < 3) return null
  // Regresión lineal simple sobre los últimos 4 meses
  const ultimos = gastoMensual.slice(-4)
  const n = ultimos.length
  const xs = ultimos.map((_, i) => i)
  const ys = ultimos.map(d => d.total)
  const sumX = xs.reduce((s,v) => s+v, 0)
  const sumY = ys.reduce((s,v) => s+v, 0)
  const sumXY = xs.reduce((s,v,i) => s + v * ys[i], 0)
  const sumX2 = xs.reduce((s,v) => s + v*v, 0)
  const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
  const intercept = (sumY - slope*sumX) / n

  const mesesFuturos = ['Sep 2026', 'Oct 2026', 'Nov 2026']
  const proyecciones = [1,2,3].map(i => Math.round(intercept + slope * (n - 1 + i)))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {mesesFuturos.map((mes, i) => {
        const base = gastoMensual[gastoMensual.length-1].total
        const pct = (proyecciones[i] - base) / base * 100
        return (
          <div key={mes} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{mes}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{fmt$(proyecciones[i])}</div>
            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>+{pct.toFixed(1)}% vs Ago</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Selector de tabs interno ──────────────────────────────────────────────────
function TabBtn({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
      transition: 'all .15s',
      background: active ? 'var(--accent)' : 'var(--surface2)',
      color: active ? '#fff' : 'var(--text-secondary)',
      boxShadow: active ? '0 2px 10px rgba(59,130,246,.3)' : 'none',
    }}>
      <span>{icon}</span> {label}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function InflacionDashboard() {
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rawData, setRawData] = useState([])
  const [gastoMensual, setGastoMensual] = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [productosSelec, setProductosSelec] = useState(['Pan francés','Leche','Carne asado','Nafta Super','Yerba mate'])

  const supabase = createClient()

  // ── Carga de datos ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // Precios unitarios por producto/mes
        const { data: preciosData, error: e1 } = await supabase
          .from('gastos')
          .select('n4, n2, fecha, monto, cantidad, unidad')
          .eq('user_id', '7e20bbf2-e72a-4b05-9dac-dfd75674760d')
          .gte('fecha', '2026-03-01')
          .lte('fecha', '2026-08-31')
          .in('n1', ['Variables', 'Fijos'])
          .gt('cantidad', 0)

        if (e1) throw e1

        // Agrupar manualmente por producto y mes
        const grouped = {}
        for (const r of preciosData || []) {
          const mes = r.fecha.substring(0, 7)
          const key = `${r.n4}__${mes}`
          if (!grouped[key]) grouped[key] = { producto: r.n4, categoria: r.n2, mes, montoTotal: 0, cantTotal: 0, unidad: r.unidad }
          grouped[key].montoTotal += r.monto
          grouped[key].cantTotal += r.cantidad
        }
        const processed = Object.values(grouped).map(g => ({
          producto: g.producto,
          categoria: g.categoria,
          mes: g.mes,
          precio_unit: Math.round(g.montoTotal / g.cantTotal),
          unidad: g.unidad,
        }))
        setRawData(processed)

        // Gasto mensual por tipo
        const { data: mensualData, error: e2 } = await supabase
          .from('gastos')
          .select('fecha, monto, n1')
          .eq('user_id', '7e20bbf2-e72a-4b05-9dac-dfd75674760d')
          .gte('fecha', '2026-03-01')
          .lte('fecha', '2026-08-31')

        if (e2) throw e2

        const mensualMap = {}
        for (const r of mensualData || []) {
          const mes = r.fecha.substring(0, 7)
          if (!mensualMap[mes]) mensualMap[mes] = { mes, total: 0, fijos: 0, variables: 0 }
          mensualMap[mes].total += r.monto
          if (r.n1 === 'Fijos') mensualMap[mes].fijos += r.monto
          if (r.n1 === 'Variables') mensualMap[mes].variables += r.monto
        }
        const mensualArr = MESES_FULL.map(m => mensualMap[m] || { mes: m, total: 0, fijos: 0, variables: 0 })
        setGastoMensual(mensualArr)

      } catch(err) {
        console.error(err)
        setError('Error cargando datos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Cálculos derivados ──────────────────────────────────────────────────────
  const { kpis, inflPorCat, categorias, todosProductos } = useMemo(() => {
    if (!rawData.length) return { kpis: {}, inflPorCat: [], categorias: [], todosProductos: [] }

    // Inflación acumulada por categoría
    const catMap = {}
    const prodMap = {}
    for (const r of rawData) {
      const key = r.producto.toLowerCase().trim()
      if (!prodMap[key]) prodMap[key] = { ...r, data: {} }
      prodMap[key].data[r.mes] = r.precio_unit
      prodMap[key].categoria = r.categoria
    }

    const inflCat = {}
    for (const p of Object.values(prodMap)) {
      const primera = p.data[MESES_FULL[0]]
      const ultima = p.data[MESES_FULL[MESES_FULL.length-1]]
      if (!primera || !ultima) continue
      const acum = (ultima - primera) / primera * 100
      const cat = p.categoria || 'Sin categoría'
      if (!inflCat[cat]) inflCat[cat] = { acums: [], cat }
      inflCat[cat].acums.push(acum)
    }

    const inflPorCat = Object.values(inflCat).map(c => ({
      cat: c.cat,
      acum: c.acums.reduce((s,v) => s+v, 0) / c.acums.length,
    })).filter(c => c.acum > 0).sort((a,b) => b.acum - a.acum)

    const categorias = ['todas', ...new Set(rawData.map(r => r.categoria).filter(Boolean).sort())]
    const todosProductos = [...new Set(rawData.map(r => r.producto))]
      .filter(p => {
        const rows = rawData.filter(r => r.producto.toLowerCase().trim() === p.toLowerCase().trim())
        return rows.some(r => r.mes === MESES_FULL[0]) && rows.some(r => r.mes === MESES_FULL[MESES_FULL.length-1])
      })
      .sort()

    // KPIs globales
    const inflGeneral = inflPorCat.length ? inflPorCat.reduce((s,c) => s+c.acum, 0) / inflPorCat.length : 0
    const masInflada = inflPorCat[0] || {}
    const menosInflada = inflPorCat[inflPorCat.length-1] || {}
    const totalAgo = gastoMensual.find(g => g.mes === '2026-08')?.total || 0
    const totalMar = gastoMensual.find(g => g.mes === '2026-03')?.total || 0

    return {
      kpis: { inflGeneral, masInflada, menosInflada, totalAgo, totalMar, variacionGasto: totalMar ? (totalAgo-totalMar)/totalMar*100 : 0 },
      inflPorCat, categorias, todosProductos,
    }
  }, [rawData, gastoMensual])

  const productosDisponibles = useMemo(() => {
    return todosProductos.filter(p => {
      const rows = rawData.filter(r => r.producto.toLowerCase().trim() === p.toLowerCase().trim())
      const mesesConData = new Set(rows.map(r => r.mes))
      return mesesConData.size >= 2
    })
  }, [todosProductos, rawData])

  const toggleProducto = (prod) => {
    setProductosSelec(prev =>
      prev.includes(prod) ? prev.filter(p => p !== prod) : prev.length < 8 ? [...prev, prod] : prev
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Analizando inflación personal…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
  }

  return (
    <div style={{ padding: '0 0 40px 0' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(59,130,246,.08)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '30%', width: 140, height: 140, borderRadius: '50%', background: 'rgba(139,92,246,.08)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Análisis Personal</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', margin: 0, lineHeight: 1 }}>
            📈 Inflación en mis Gastos
          </h2>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 13 }}>Marzo → Agosto 2026 · jperna@htc.gba.gov.ar</p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPICard label="Inflación promedio" value={fmtPct(kpis.inflGeneral)} sub="acumulada Mar→Ago" color="#f59e0b" icon="🔥" />
        <KPICard label="Categoría más cara" value={kpis.masInflada?.cat || '—'} sub={kpis.masInflada ? fmtPct(kpis.masInflada.acum) + ' acum.' : ''} color="#ef4444" icon="📈" />
        <KPICard label="Gasto Agosto" value={fmt$(kpis.totalAgo)} sub={`${fmtPct(kpis.variacionGasto)} vs Marzo`} color="#3b82f6" icon="💸" />
        <KPICard label="Cat. más estable" value={kpis.menosInflada?.cat || '—'} sub={kpis.menosInflada ? fmtPct(kpis.menosInflada.acum) + ' acum.' : ''} color="#10b981" icon="✅" />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <TabBtn id="resumen"    label="Resumen"      icon="📊" active={tab==='resumen'}    onClick={setTab} />
        <TabBtn id="productos"  label="Productos"    icon="🏷️" active={tab==='productos'}  onClick={setTab} />
        <TabBtn id="tabla"      label="Tabla precios" icon="📋" active={tab==='tabla'}     onClick={setTab} />
        <TabBtn id="proyeccion" label="Proyección"   icon="🔮" active={tab==='proyeccion'} onClick={setTab} />
      </div>

      {/* ══ TAB RESUMEN ══════════════════════════════════════════════════════ */}
      {tab === 'resumen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Inflación por categoría */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 Inflación acumulada por categoría (Mar→Ago)
            </h3>
            <div style={{ height: 280 }}>
              <BarCategorias inflPorCat={inflPorCat} />
            </div>
          </div>

          {/* Gasto total mensual */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              💸 Evolución del gasto mensual total
            </h3>
            <div style={{ height: 240 }}>
              <LineGastoTotal gastoMensual={gastoMensual} />
            </div>
          </div>

          {/* Mini tabla resumen */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>📅 Gasto mensual detallado</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Mes', 'Total', 'Fijos', 'Variables', 'Variación'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gastoMensual.map((g, i) => {
                    const prev = i > 0 ? gastoMensual[i-1].total : null
                    const variacion = prev ? (g.total - prev) / prev * 100 : null
                    return (
                      <tr key={g.mes} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{MESES[i]} 2026</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#3b82f6' }}>{fmt$(g.total)}</td>
                        <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>{fmt$(g.fijos)}</td>
                        <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{fmt$(g.variables)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700,
                          color: variacion === null ? 'var(--text-muted)' : variacion > 10 ? '#ef4444' : variacion > 5 ? '#f59e0b' : '#10b981' }}>
                          {variacion === null ? '—' : fmtPct(variacion)}
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

      {/* ══ TAB PRODUCTOS ════════════════════════════════════════════════════ */}
      {tab === 'productos' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
            🏷️ Evolución de precios por producto (variación % desde Marzo)
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Seleccioná hasta 8 productos para comparar</p>

          {/* Selector de productos */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, maxHeight: 120, overflowY: 'auto', padding: '8px 0' }}>
            {productosDisponibles.map(p => (
              <button key={p} onClick={() => toggleProducto(p)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${productosSelec.includes(p) ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all .1s',
                  background: productosSelec.includes(p) ? 'var(--accent-light)' : 'var(--surface2)',
                  color: productosSelec.includes(p) ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                {p}
              </button>
            ))}
          </div>

          <div style={{ height: 320 }}>
            {productosSelec.length > 0
              ? <LinePrecios data={rawData} productos={productosSelec} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Seleccioná productos arriba</div>
            }
          </div>
        </div>
      )}

      {/* ══ TAB TABLA ════════════════════════════════════════════════════════ */}
      {tab === 'tabla' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
            📋 Tabla de precios con inflación mensual
          </h3>

          {/* Filtro por categoría */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {categorias.map(cat => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: filtroCategoria === cat
                    ? (cat === 'todas' ? 'var(--accent)' : catColor(cat))
                    : 'var(--surface2)',
                  color: filtroCategoria === cat ? '#fff' : 'var(--text-secondary)',
                }}>
                {cat === 'todas' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          <TablaProductos data={rawData} filtroCategoria={filtroCategoria} />
        </div>
      )}

      {/* ══ TAB PROYECCIÓN ═══════════════════════════════════════════════════ */}
      {tab === 'proyeccion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>🔮 Proyección de gasto</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Basado en tendencia lineal de los últimos 4 meses</p>
            <Proyeccion gastoMensual={gastoMensual} />
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>🏷️ Top 10 productos con más inflación</h3>
            {rawData.length > 0 && (() => {
              const map = {}
              for (const r of rawData) {
                const key = r.producto.toLowerCase().trim()
                if (!map[key]) map[key] = { producto: r.producto, categoria: r.categoria, data: {} }
                map[key].data[r.mes] = r.precio_unit
              }
              const ranking = Object.values(map)
                .filter(p => p.data[MESES_FULL[0]] && p.data[MESES_FULL[5]])
                .map(p => ({
                  producto: p.producto,
                  categoria: p.categoria,
                  acum: (p.data[MESES_FULL[5]] - p.data[MESES_FULL[0]]) / p.data[MESES_FULL[0]] * 100,
                  precioBase: p.data[MESES_FULL[0]],
                  precioFinal: p.data[MESES_FULL[5]],
                }))
                .sort((a,b) => b.acum - a.acum)
                .slice(0, 10)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ranking.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{p.producto}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.categoria} · {fmt$(p.precioBase)} → {fmt$(p.precioFinal)}</div>
                      </div>
                      <div style={{ position: 'relative', width: 120, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
                          width: `${Math.min(100, (p.acum / ranking[0].acum) * 100)}%`,
                          background: p.acum > 35 ? '#ef4444' : p.acum > 25 ? '#f59e0b' : '#10b981',
                        }} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 13, minWidth: 50, textAlign: 'right',
                        color: p.acum > 35 ? '#ef4444' : p.acum > 25 ? '#f59e0b' : '#10b981' }}>
                        {fmtPct(p.acum)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

        </div>
      )}

    </div>
  )
}
