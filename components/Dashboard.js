'use client'
import { useMemo } from 'react'
import { N1_COLORS, CHART_COLORS, fmt, uniq } from '../lib/constants'
import { useChart, PALETTE, baseOptions } from '../lib/useChart'
import { useApp } from '../context/AppContext'
import {
  IconDinero, IconRecibo, IconCalendario, IconEtiquetas,
  IconRegistrar, IconRecurrentes, IconTip, IconTrofeo,
} from '../lib/icons'

const fmtAxis = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`
const n1Color = (name, idx) => (N1_COLORS[name] || {}).bg || PALETTE[idx % PALETTE.length]

// ── Doughnut N1 ───────────────────────────────────────────────────────────────
function DoughnutN1({ byN1 }) {
  const canvasRef = useChart('doughnut', (theme) => ({
    data: {
      labels: byN1.map(d => d.name),
      datasets: [{ data: byN1.map(d => d.value), backgroundColor: byN1.map((d,i) => n1Color(d.name,i)), borderColor: theme.bgColor, borderWidth: 3, hoverOffset: 8 }],
    },
    options: {
      ...baseOptions(theme), cutout: '62%',
      plugins: {
        ...baseOptions(theme).plugins,
        legend: { position: 'bottom', ...baseOptions(theme).plugins.legend },
        tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${byN1[ctx.dataIndex].pct}%)` } },
      },
    },
  }), [JSON.stringify(byN1)])
  return <div style={{ position: 'relative', height: 240, width: '100%' }}><canvas ref={canvasRef} /></div>
}

// ── Bar horizontal N3 ─────────────────────────────────────────────────────────
function BarTopN3({ byN3 }) {
  const canvasRef = useChart('bar', (theme) => ({
    data: {
      labels: byN3.map(d => d.name),
      datasets: [{ label: 'Gasto', data: byN3.map(d => d.value), backgroundColor: byN3.map((_,i) => `${PALETTE[i%PALETTE.length]}cc`), borderColor: byN3.map((_,i) => PALETTE[i%PALETTE.length]), borderWidth: 1.5, borderRadius: 6, borderSkipped: false }],
    },
    options: {
      ...baseOptions(theme), indexAxis: 'y',
      plugins: { ...baseOptions(theme).plugins, legend: { display: false }, tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: theme.gridColor, drawBorder: false }, ticks: { color: theme.textColor, font: { size: 11 }, callback: fmtAxis }, border: { display: false } },
        y: { grid: { display: false }, ticks: { color: theme.textColor, font: { size: 11, weight: '600' } }, border: { display: false } },
      },
    },
  }), [JSON.stringify(byN3)])
  const h = Math.max(200, byN3.length * 38)
  return <div style={{ position: 'relative', height: h, width: '100%' }}><canvas ref={canvasRef} /></div>
}

// ── Line tendencia ────────────────────────────────────────────────────────────
function LineTendencia({ byDia }) {
  const canvasRef = useChart('line', (theme) => ({
    data: {
      labels: byDia.map(d => d.fecha),
      datasets: [{ label: 'Gasto diario', data: byDia.map(d => d.monto), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)', pointBackgroundColor: '#3b82f6', pointBorderColor: theme.bgColor, pointBorderWidth: 2, pointRadius: byDia.length > 30 ? 2 : 4, pointHoverRadius: 6, borderWidth: 2.5, fill: true, tension: 0.35 }],
    },
    options: {
      ...baseOptions(theme),
      plugins: { ...baseOptions(theme).plugins, legend: { display: false }, tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: theme.textColor, font: { size: 10 }, maxTicksLimit: 10, maxRotation: 30 }, border: { display: false } },
        y: { grid: { color: theme.gridColor, drawBorder: false }, ticks: { color: theme.textColor, font: { size: 11 }, callback: fmtAxis }, border: { display: false } },
      },
    },
  }), [JSON.stringify(byDia)])
  return <div style={{ position: 'relative', height: 220, width: '100%' }}><canvas ref={canvasRef} /></div>
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ gastos, onNavigate }) {
  const { fmtMoney } = useApp()
  const total  = gastos.reduce((s, g) => s + (g.monto || 0), 0)

  const byN1 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { m[g.n1] = (m[g.n1] || 0) + g.monto })
    return Object.entries(m).map(([name, value]) => ({ name, value, pct: total ? Math.round(value/total*100) : 0 })).sort((a,b) => b.value - a.value)
  }, [gastos, total])

  const byN3 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { m[g.n3] = (m[g.n3] || 0) + g.monto })
    return Object.entries(m).map(([name,value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10)
  }, [gastos])

  const byDia = useMemo(() => {
    const m = {}
    gastos.forEach(g => { m[g.fecha] = (m[g.fecha] || 0) + g.monto })
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([fecha,monto]) => ({ fecha: fecha.slice(5), monto }))
  }, [gastos])

  const topItems = useMemo(() => {
    const m = {}
    gastos.forEach(g => {
      if (!m[g.n4]) m[g.n4] = { name: g.n4, cantidad: 0, monto: 0, unidad: g.unidad }
      m[g.n4].cantidad += parseFloat(g.cantidad) || 0
      m[g.n4].monto    += g.monto || 0
    })
    return Object.values(m).sort((a,b) => b.monto - a.monto).slice(0, 6)
  }, [gastos])

  const dias = uniq(gastos.map(g => g.fecha)).length || 1

  // ── Estado vacío ────────────────────────────────────────────────────────────
  if (!gastos.length) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px 32px', background: 'var(--surface)', borderRadius: 20, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
        <IconDinero size={64} weight="duotone" color="var(--accent)" style={{ marginBottom: 12 }} aria-hidden="true" />
        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 800 }}>¡Empezá a registrar!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Tu dashboard aparecerá aquí con gráficos y estadísticas<br />una vez que registres tu primer gasto.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { Icon: IconRegistrar,   titulo: 'Registrar un gasto',    desc: 'Anotá tu primer gasto ahora',  color: '#3b82f6', tab: 'registro'      },
          { Icon: IconRecurrentes, titulo: 'Configurar recurrentes', desc: 'Automatizá gastos fijos',      color: '#d97706', tab: 'configuracion' },
        ].map(({ Icon: Ic, titulo, desc, color, tab }) => (
          <button key={tab} onClick={() => onNavigate?.(tab)}
            style={{ padding: '20px', borderRadius: 16, border: `2px solid ${color}30`, background: `${color}08`, cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic size={22} weight="duotone" color={color} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--accent-light)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--accent)', display: 'flex', gap: 12 }}>
        <IconTip size={20} weight="duotone" color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>Tip: usá el acceso rápido</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Agregá la app a tu pantalla de inicio y usá el shortcut "Gasto rápido" para registrar en segundos.
          </p>
        </div>
      </div>
    </div>
  )

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = [
    { Icon: IconDinero,     label: 'Total Gastado',  value: fmtMoney ? fmtMoney(total)       : fmt(total),       color: '#3b82f6' },
    { Icon: IconRecibo,     label: 'Registros',      value: gastos.length,                                        color: '#10b981' },
    { Icon: IconCalendario, label: 'Promedio/día',   value: fmtMoney ? fmtMoney(total/dias)  : fmt(total/dias),   color: '#f59e0b' },
    { Icon: IconEtiquetas,  label: 'Tipos activos',  value: byN1.length,                                          color: '#8b5cf6' },
  ]

  const card  = { background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }
  const title = { margin: '0 0 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        {kpis.map(({ Icon: Ic, label, value, color }, i) => (
          <div key={i} style={{ ...card, borderLeft: `4px solid ${color}`, padding: '20px 22px' }}>
            <Ic size={26} weight="duotone" color={color} style={{ marginBottom: 8 }} aria-hidden="true" />
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Fila 1: Doughnut + Barras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        <div style={card}>
          <h3 style={title}>Distribución por Tipo</h3>
          <DoughnutN1 byN1={byN1} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byN1.map(({ name, value, pct }, i) => {
              const c = N1_COLORS[name] || { bg: n1Color(name,i), light: 'var(--surface2)', text: n1Color(name,i) }
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: c.text || c.bg }}>{name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{fmt(value)} <b style={{ color: c.bg }}>({pct}%)</b></span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c.bg, borderRadius: 99, transition: 'width .5s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={card}>
          <h3 style={title}>Top Subcategorías</h3>
          <BarTopN3 byN3={byN3} />
        </div>
      </div>

      {/* Tendencia */}
      {byDia.length > 1 && (
        <div style={card}>
          <h3 style={title}>Tendencia de Gastos</h3>
          <LineTendencia byDia={byDia} />
        </div>
      )}

      {/* Top ítems */}
      <div style={card}>
        <h3 style={{ ...title, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconTrofeo size={16} weight="fill" color="#f59e0b" aria-hidden="true" />
          Top Ítems por Gasto
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {topItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: PALETTE[i%PALETTE.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{i+1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.cantidad} {item.unidad}</div>
              </div>
              <div style={{ fontWeight: 800, color: PALETTE[i%PALETTE.length], fontSize: 14, flexShrink: 0 }}>{fmt(item.monto)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
