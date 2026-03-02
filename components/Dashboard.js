'use client'
import { useMemo, useState } from 'react'
import { N1_COLORS, fmt, uniq, PERIODOS, getPeriodo, getPeriodoAnterior } from '../lib/constants'
import { useChart, PALETTE, baseOptions } from '../lib/useChart'
import { useApp } from '../context/AppContext'
import { useIngresos } from '../lib/useIngresos'
import { useAlertas, ALERTA_STYLE } from '../lib/useAlertas'
import {
  IconDinero, IconCalendario, IconTrofeo, IconEtiquetas,
  IconRegistrar, IconRecurrentes, IconTip, IconCaretDown,
} from '../lib/icons'

const fmtAxis = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`
const n1Color = (name, idx) => (N1_COLORS[name] || {}).bg || PALETTE[idx % PALETTE.length]

// ── Selector de período ──────────────────────────────────────────────────────
function PeriodSelector({ periodo, setPeriodo, from, to, setFrom, setTo }) {
  const handleSelect = (id) => {
    setPeriodo(id)
    if (id !== 'custom') { const rng = getPeriodo(id); setFrom(rng.from); setTo(rng.to) }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PERIODOS.filter(p => p.id !== 'custom').map(p => (
          <button key={p.id} onClick={() => handleSelect(p.id)} aria-pressed={periodo === p.id}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s',
              background: periodo === p.id ? 'var(--accent)' : 'var(--surface2)',
              color:      periodo === p.id ? '#fff'          : 'var(--text-secondary)',
              boxShadow:  periodo === p.id ? '0 2px 8px rgba(99,102,241,.35)' : 'none' }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => handleSelect('custom')} aria-pressed={periodo === 'custom'}
          style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
            background: periodo === 'custom' ? 'var(--accent)' : 'var(--surface2)',
            color:      periodo === 'custom' ? '#fff'          : 'var(--text-secondary)' }}>
          Personalizado <IconCaretDown size={12} aria-hidden="true" />
        </button>
      </div>
      {periodo === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 13 }} />
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 13 }} />
        </div>
      )}
    </div>
  )
}

// ── Doughnut N1 ──────────────────────────────────────────────────────────────
function DoughnutN1({ byN1 }) {
  const canvasRef = useChart('doughnut', (theme) => ({
    data: {
      labels: byN1.map(d => d.name),
      datasets: [{ data: byN1.map(d => d.value), backgroundColor: byN1.map((d,i) => n1Color(d.name,i)), borderColor: theme.bgColor, borderWidth: 3, hoverOffset: 8 }],
    },
    options: {
      ...baseOptions(theme), cutout: '62%',
      plugins: { ...baseOptions(theme).plugins,
        legend: { position: 'bottom', ...baseOptions(theme).plugins.legend },
        tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${byN1[ctx.dataIndex].pct}%)` } } },
    },
  }), [JSON.stringify(byN1)])
  return <div style={{ position: 'relative', height: 240, width: '100%' }}><canvas ref={canvasRef} /></div>
}

// ── Bar horizontal top subcategorías ────────────────────────────────────────
function BarTopN3({ byN3 }) {
  const canvasRef = useChart('bar', (theme) => ({
    data: {
      labels: byN3.map(d => d.name),
      datasets: [{ label: 'Gasto', data: byN3.map(d => d.value),
        backgroundColor: byN3.map((_,i) => `${PALETTE[i%PALETTE.length]}cc`),
        borderColor: byN3.map((_,i) => PALETTE[i%PALETTE.length]),
        borderWidth: 1.5, borderRadius: 6, borderSkipped: false }],
    },
    options: {
      ...baseOptions(theme), indexAxis: 'y',
      plugins: { ...baseOptions(theme).plugins, legend: { display: false },
        tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: theme.gridColor, drawBorder: false }, ticks: { color: theme.textColor, font: { size: 11 }, callback: fmtAxis }, border: { display: false } },
        y: { grid: { display: false }, ticks: { color: theme.textColor, font: { size: 11, weight: '600' } }, border: { display: false } },
      },
    },
  }), [JSON.stringify(byN3)])
  const h = Math.max(200, byN3.length * 40)
  return <div style={{ position: 'relative', height: h, width: '100%' }}><canvas ref={canvasRef} /></div>
}

// ── Badge Δ vs período anterior ──────────────────────────────────────────────
function DeltaBadge({ current, prev }) {
  if (!prev) return null
  const pct = Math.round((current - prev) / prev * 100)
  const up   = pct > 0
  const zero = pct === 0
  const color = zero ? '#64748b' : up ? '#ef4444' : '#10b981'
  const bg    = zero ? '#f1f5f9' : up ? '#fee2e2' : '#d1fae5'
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: bg, color, marginLeft: 8 }}>
      {zero ? '= igual' : `${up ? '▲' : '▼'} ${Math.abs(pct)}% vs ant.`}
    </span>
  )
}

// ── Lista de ítems (Top por Gasto o Cantidad) ────────────────────────────────
function ItemList({ items, valueKey, valueLabel, fmtValue, paletteOffset = 0, emptyMsg }) {
  if (!items.length) return (
    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0', margin: 0 }}>{emptyMsg}</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => {
        const color = PALETTE[(i + paletteOffset) % PALETTE.length]
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {i+1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.subtitle}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, color, fontSize: 15, lineHeight: 1 }}>{fmtValue(item[valueKey])}</div>
              {item.sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sublabel}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Dashboard principal ──────────────────────────────────────────────────────

// ── Banners de alerta ─────────────────────────────────────────────────────────
function AlertaBanners({ alertas, onNavigate }) {
  if (!alertas || alertas.length === 0) return null
  const criticas = alertas.filter(a => a.severidad === 'critica')
  const advertencias = alertas.filter(a => a.severidad === 'advertencia')
  const mostrar = [...criticas, ...advertencias].slice(0, 3)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {mostrar.map(a => {
        const s = ALERTA_STYLE[a.severidad]
        return (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
            background:s.bg, border:`1px solid ${s.border}`, borderLeft:`4px solid ${s.color}`,
            borderRadius:12, cursor:'default' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{s.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{a.titulo}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:1 }}>{a.detalle}</div>
            </div>
            {a.pct !== undefined && (
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:s.color }}>{Math.min(a.pct,999)}%</div>
                <div style={{ width:60, height:4, borderRadius:2, background:'#e2e8f0', overflow:'hidden', marginTop:3 }}>
                  <div style={{ height:'100%', width:`${Math.min(a.pct,100)}%`,
                    background:s.color, borderRadius:2 }}/>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {alertas.length > 3 && (
        <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'4px 0' }}>
          +{alertas.length - 3} alertas más en la campana 🔔
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ gastos: todosLosGastos, onNavigate, alertas = [] }) {
  const { fmtMoney } = useApp()
  const money = v => fmtMoney ? fmtMoney(v) : fmt(v)

  const { ingresos: todosLosIngresos } = useIngresos()

  const [periodo, setPeriodo] = useState('mes')
  const [from, setFrom] = useState(() => getPeriodo('mes').from)
  const [to,   setTo]   = useState(() => getPeriodo('mes').to)

  // Filtrado período actual
  const gastos = useMemo(() =>
    todosLosGastos.filter(g => (!from || g.fecha >= from) && (!to || g.fecha <= to)),
    [todosLosGastos, from, to]
  )

  // Filtrado período anterior
  const gastosAnt = useMemo(() => {
    if (!from || !to) return []
    const { from: pf, to: pt } = getPeriodoAnterior({ from, to })
    return todosLosGastos.filter(g => g.fecha >= pf && g.fecha <= pt)
  }, [todosLosGastos, from, to])

  const total    = gastos.reduce((s, g) => s + (g.monto || 0), 0)
  const totalAnt = gastosAnt.reduce((s, g) => s + (g.monto || 0), 0)

  // ── Ingresos del período ────────────────────────────────────────────────────
  const ingresosDelPeriodo = useMemo(() =>
    todosLosIngresos.filter(i => (!from || i.fecha >= from) && (!to || i.fecha <= to)),
    [todosLosIngresos, from, to]
  )
  const totalIngresos  = ingresosDelPeriodo.reduce((s,i) => s + (i.monto||0), 0)
  const saldoDisp      = totalIngresos - total
  const pctGastado     = totalIngresos > 0 ? Math.round(total / totalIngresos * 100) : null

  // Gastos hormiga: gastos de monto pequeño (< 1% del total o < $2000), frecuentes
  const HORMIGA_MAX = Math.max(2000, total * 0.01)
  const gastosHormiga = useMemo(() => {
    const pequeños = gastos.filter(g => g.monto > 0 && g.monto <= HORMIGA_MAX)
    const totalHormiga = pequeños.reduce((s,g) => s + g.monto, 0)
    return { count: pequeños.length, total: totalHormiga,
      pct: total > 0 ? Math.round(totalHormiga/total*100) : 0 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, total])

  const dias = useMemo(() => {
    if (!from || !to) return uniq(gastos.map(g => g.fecha)).length || 1
    const f = new Date(from + 'T00:00:00')
    const t = new Date(to   + 'T00:00:00')
    const hoy = new Date().toISOString().slice(0, 10)
    return to >= hoy
      ? (uniq(gastos.map(g => g.fecha)).length || 1)
      : Math.round((t - f) / 86400000) + 1
  }, [gastos, from, to])

  const promDia    = total    / (dias || 1)
  const promDiaAnt = totalAnt / (dias || 1)

  const byN1 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { m[g.n1] = (m[g.n1] || 0) + g.monto })
    return Object.entries(m)
      .map(([name, value]) => ({ name, value, pct: total ? Math.round(value/total*100) : 0 }))
      .sort((a,b) => b.value - a.value)
  }, [gastos, total])

  const byN3 = useMemo(() => {
    const m = {}
    gastos.forEach(g => {
      const k = [g.n2, g.n3, g.n4].filter(Boolean).join(' › ')
      m[k] = (m[k] || 0) + g.monto
    })
    return Object.entries(m).map(([name,value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 7)
  }, [gastos])

  const topGasto = useMemo(() => {
    const m = {}
    gastos.forEach(g => {
      if (!g.n4) return
      if (!m[g.n4]) m[g.n4] = { name: g.n4, cantidad: 0, monto: 0, unidad: g.unidad }
      m[g.n4].cantidad += parseFloat(g.cantidad) || 0
      m[g.n4].monto    += g.monto || 0
    })
    return Object.values(m).sort((a,b) => b.monto - a.monto).slice(0, 6).map(x => ({
      ...x,
      subtitle: `${x.cantidad % 1 === 0 ? x.cantidad : x.cantidad.toFixed(2)} ${x.unidad || ''} · ${total > 0 ? (x.monto/total*100).toFixed(1) : 0}% del total`,
    }))
  }, [gastos, total])

  const topCantidad = useMemo(() => {
    const m = {}
    gastos.forEach(g => {
      if (!g.n4 || !g.cantidad) return
      if (!m[g.n4]) m[g.n4] = { name: g.n4, cantidad: 0, monto: 0, unidad: g.unidad }
      m[g.n4].cantidad += parseFloat(g.cantidad) || 0
      m[g.n4].monto    += g.monto || 0
    })
    return Object.values(m).filter(x => x.cantidad > 0)
      .sort((a,b) => b.cantidad - a.cantidad).slice(0, 6)
      .map(x => ({
        ...x,
        subtitle: money(x.monto) + ' gastados',
        sublabel: x.unidad || 'unid.',
      }))
  }, [gastos, fmtMoney])

  const periodoLabel = PERIODOS.find(p => p.id === periodo)?.label || 'Período'

  // ── Estado vacío global ──────────────────────────────────────────────────────
  if (!todosLosGastos.length) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px 32px', background: 'var(--surface)', borderRadius: 20, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
        <IconDinero size={64} color="var(--accent)" style={{ marginBottom: 12 }} aria-hidden="true" />
        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 800 }}>¡Empezá a registrar!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Tu dashboard aparecerá aquí con gráficos y estadísticas<br />una vez que registres tu primer gasto.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { Icon: IconRegistrar,   titulo: 'Registrar un gasto',    desc: 'Anotá tu primer gasto ahora', color: '#3b82f6', tab: 'registro'      },
          { Icon: IconRecurrentes, titulo: 'Configurar recurrentes', desc: 'Automatizá gastos fijos',     color: '#d97706', tab: 'configuracion' },
        ].map(({ Icon: Ic, titulo, desc, color, tab }) => (
          <button key={tab} onClick={() => onNavigate?.(tab)}
            style={{ padding: '20px', borderRadius: 16, border: `2px solid ${color}30`, background: `${color}08`, cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic size={22} color={color} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ background: 'var(--accent-light)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--accent)', display: 'flex', gap: 12 }}>
        <IconTip size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <b style={{ color: 'var(--accent)' }}>Tip:</b> Agregá la app a tu pantalla de inicio y usá el shortcut <b>Gasto rápido</b> para registrar en segundos.
        </p>
      </div>
    </div>
  )

  const card  = { background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }
  const sTitle = { margin: '0 0 16px', fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Selector de período */}
      <div style={{ ...card, padding: '16px 20px' }}>
        <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} from={from} setFrom={setFrom} to={to} setTo={setTo} />
      </div>

      {/* KPI principal — Total + Promedio/día */}
      <div style={{ ...card, borderLeft: '4px solid var(--accent)', padding: '22px 26px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Total gastado — {periodoLabel}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
            {money(total)}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Período anterior: {money(totalAnt)}
            </span>
            <DeltaBadge current={total} prev={totalAnt} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Promedio / día
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            {money(promDia)}
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dias} día{dias !== 1 ? 's' : ''}</span>
            <DeltaBadge current={promDia} prev={promDiaAnt} />
          </div>
        </div>
      </div>

      {/* ── Banners de alerta ── */}
      <AlertaBanners alertas={alertas} onNavigate={onNavigate} />

      {/* ── Panel Ingresos vs Gastos ── */}
      {totalIngresos > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
          {/* Ingresos */}
          <div style={{ ...card, borderTop:'3px solid #22c55e', padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Ingresos</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#22c55e' }}>{money(totalIngresos)}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{periodoLabel}</div>
          </div>

          {/* % Gastado */}
          <div style={{ ...card, borderTop:`3px solid ${pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e'}`, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>% Gastado</div>
            <div style={{ fontSize:22, fontWeight:800, color:pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e' }}>
              {pctGastado}%
            </div>
            <div style={{ marginTop:6, height:5, borderRadius:3, background:'var(--border)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min(pctGastado,100)}%`, borderRadius:3, transition:'width .5s',
                background:pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e' }}/>
            </div>
          </div>

          {/* Saldo disponible */}
          <div style={{ ...card, borderTop:`3px solid ${saldoDisp>=0?'#3b82f6':'#ef4444'}`, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Saldo disponible</div>
            <div style={{ fontSize:22, fontWeight:800, color:saldoDisp>=0?'#3b82f6':'#ef4444' }}>
              {saldoDisp>=0?'+':''}{money(saldoDisp)}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
              {saldoDisp>=0?'Superávit':'Déficit'} del período
            </div>
          </div>

          {/* Gastos hormiga */}
          {gastosHormiga.count > 0 && (
            <div style={{ ...card, borderTop:'3px solid #8b5cf6', padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Gastos hormiga</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#8b5cf6' }}>{money(gastosHormiga.total)}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                {gastosHormiga.count} gastos pequeños · {gastosHormiga.pct}% del total
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sin ingresos cargados — CTA ── */}
      {totalIngresos === 0 && gastos.length > 0 && (
        <div style={{ ...card, background:'#eff6ff', border:'1px solid #bfdbfe', padding:'14px 20px',
          display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}
          onClick={() => onNavigate?.('ingresos')}>
          <span style={{ fontSize:24 }}>💡</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1e40af' }}>Registrá tus ingresos para ver el % gastado y el saldo disponible</div>
            <div style={{ fontSize:12, color:'#3b82f6', marginTop:2 }}>Ir a Ingresos →</div>
          </div>
        </div>
      )}

      {/* Sin datos en período */}
      {gastos.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <IconCalendario size={40} color="var(--text-muted)" style={{ marginBottom: 10 }} aria-hidden="true" />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Sin gastos en este período</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Seleccioná otro rango de fechas o registrá nuevos gastos.</p>
        </div>
      ) : (<>

        {/* Fila: Doughnut + Top Subcategorías */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          <div style={card}>
            <h3 style={sTitle}><IconEtiquetas size={14} aria-hidden="true" /> Distribución por Tipo</h3>
            <DoughnutN1 byN1={byN1} />
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byN1.map(({ name, value, pct }, i) => {
                const c = N1_COLORS[name] || { bg: n1Color(name,i), text: n1Color(name,i) }
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: c.text || c.bg }}>{name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{money(value)} <b style={{ color: c.bg }}>({pct}%)</b></span>
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
            <h3 style={sTitle}>Top Subcategorías</h3>
            {byN3.length > 0
              ? <BarTopN3 byN3={byN3} />
              : <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0', margin: 0 }}>Sin datos suficientes.</p>
            }
          </div>
        </div>

        {/* Fila: Top por Gasto + Top por Cantidad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          <div style={card}>
            <h3 style={sTitle}><IconTrofeo size={14} weight="fill" color="#f59e0b" aria-hidden="true" /> Top Ítems por Gasto</h3>
            <ItemList
              items={topGasto}
              valueKey="monto"
              fmtValue={money}
              paletteOffset={0}
              emptyMsg="Sin ítems registrados en el período."
            />
          </div>

          <div style={card}>
            <h3 style={sTitle}><IconDinero size={14} aria-hidden="true" /> Top Ítems por Cantidad</h3>
            <ItemList
              items={topCantidad}
              valueKey="cantidad"
              fmtValue={v => v % 1 === 0 ? String(v) : v.toFixed(2)}
              paletteOffset={3}
              emptyMsg="Registrá cantidad en tus gastos para ver este ranking."
            />
          </div>
        </div>

      </>)}
    </div>
  )
}
