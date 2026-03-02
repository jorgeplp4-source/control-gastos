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

// ── Lista de ítems ────────────────────────────────────────────────────────────
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

// ── Banners de alerta — con botón para cerrar ─────────────────────────────────
function AlertaBanners({ alertas, onNavigate }) {
  const [cerradas, setCerradas] = useState(new Set())
  if (!alertas || alertas.length === 0) return null

  const criticas    = alertas.filter(a => a.severidad === 'critica'     && !cerradas.has(a.id))
  const advertencias= alertas.filter(a => a.severidad === 'advertencia' && !cerradas.has(a.id))
  const mostrar     = [...criticas, ...advertencias].slice(0, 3)
  if (!mostrar.length) return null

  const cerrar = (id) => setCerradas(prev => new Set([...prev, id]))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {mostrar.map(a => {
        const s = ALERTA_STYLE[a.severidad]
        return (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
            background:s.bg, border:`1px solid ${s.border}`, borderLeft:`4px solid ${s.color}`,
            borderRadius:12 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{s.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{a.titulo}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:1 }}>{a.detalle}</div>
            </div>
            {a.pct !== undefined && (
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:s.color }}>{Math.min(a.pct,999)}%</div>
                <div style={{ width:60, height:4, borderRadius:2, background:'#e2e8f0', overflow:'hidden', marginTop:3 }}>
                  <div style={{ height:'100%', width:`${Math.min(a.pct,100)}%`, background:s.color, borderRadius:2 }}/>
                </div>
              </div>
            )}
            {/* Botón cerrar */}
            <button onClick={() => cerrar(a.id)}
              title="Cerrar alerta"
              style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8',
                fontSize:16, lineHeight:1, padding:'2px 4px', borderRadius:4, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.color = s.color}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
              ✕
            </button>
          </div>
        )
      })}
      {alertas.filter(a => !cerradas.has(a.id)).length > 3 && (
        <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'4px 0' }}>
          +{alertas.filter(a => !cerradas.has(a.id)).length - 3} alertas más en la campana 🔔
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ gastos: todosLosGastos, onNavigate, alertas = [] }) {
  const { fmtMoney } = useApp()
  const { ingresos } = useIngresos()
  const money = fmtMoney

  const [periodo, setPeriodo] = useState('mes')
  const initRng = getPeriodo('mes')
  const [from, setFrom] = useState(initRng.from)
  const [to,   setTo]   = useState(initRng.to)

  const gastos = useMemo(() =>
    todosLosGastos.filter(g => g.fecha >= from && g.fecha <= to),
    [todosLosGastos, from, to]
  )

  const gastosAnt = useMemo(() => {
    const ant = getPeriodoAnterior({ from, to })
    return todosLosGastos.filter(g => g.fecha >= ant.from && g.fecha <= ant.to)
  }, [todosLosGastos, from, to])

  const total    = useMemo(() => gastos.reduce((s, g) => s + (g.monto || 0), 0), [gastos])
  const totalAnt = useMemo(() => gastosAnt.reduce((s, g) => s + (g.monto || 0), 0), [gastosAnt])

  const dias    = useMemo(() => { const d = new Date(to) - new Date(from); return Math.max(1, Math.round(d/86400000) + 1) }, [from, to])
  const promDia = total / dias
  const diasAnt = useMemo(() => { const ant = getPeriodoAnterior({from,to}); const d = new Date(ant.to)-new Date(ant.from); return Math.max(1,Math.round(d/86400000)+1) }, [from,to])
  const promDiaAnt = totalAnt / diasAnt

  const byN1 = useMemo(() => {
    const map = {}
    gastos.forEach(g => { map[g.n1] = (map[g.n1] || 0) + (g.monto || 0) })
    const entries = Object.entries(map).sort((a,b) => b[1]-a[1])
    return entries.map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round(value/total*100) : 0 }))
  }, [gastos, total])

  const byN3 = useMemo(() => {
    const map = {}
    gastos.forEach(g => { const k = g.n3 || g.n2 || g.n1; map[k] = (map[k]||0)+(g.monto||0) })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  }, [gastos])

  const topGasto = useMemo(() => {
    const map = {}
    gastos.forEach(g => {
      const k = g.n4 || g.n3 || g.n2 || g.n1
      if (!map[k]) map[k] = { name:k, monto:0, count:0, subtitle: g.n1 }
      map[k].monto += g.monto||0; map[k].count++
    })
    return Object.values(map).sort((a,b)=>b.monto-a.monto).slice(0,8)
      .map(x => ({ ...x, sublabel:`${x.count} compra${x.count!==1?'s':''}` }))
  }, [gastos])

  const topCantidad = useMemo(() => {
    const map = {}
    gastos.filter(g=>g.cantidad>0).forEach(g => {
      const k = g.n4||g.n3||g.n2||g.n1
      if (!map[k]) map[k] = { name:k, cantidad:0, count:0, subtitle:g.unidad||'unidad' }
      map[k].cantidad += parseFloat(g.cantidad)||0; map[k].count++
    })
    return Object.values(map).sort((a,b)=>b.cantidad-a.cantidad).slice(0,8)
  }, [gastos])

  const periodoLabel = useMemo(() => {
    const p = PERIODOS.find(p => p.id === periodo)
    return p ? p.label : `${from} – ${to}`
  }, [periodo, from, to])

  // Ingresos y métricas
  const totalIngresos = useMemo(() =>
    ingresos.filter(i => i.fecha >= from && i.fecha <= to).reduce((s,i)=>s+(i.monto||0),0),
    [ingresos, from, to]
  )
  const saldoDisp  = totalIngresos - total
  const pctGastado = totalIngresos > 0 ? Math.round(total/totalIngresos*100) : 0
  const gastosHormiga = useMemo(() => {
    const HORMIGA_MAX = Math.max(1500, total*0.008)
    const h = gastos.filter(g=>g.monto>0&&g.monto<=HORMIGA_MAX)
    const tot = h.reduce((s,g)=>s+g.monto,0)
    return { count:h.length, total:tot, pct: total>0?Math.round(tot/total*100):0 }
  }, [gastos, total])

  const card   = { background:'var(--surface)', borderRadius:16, padding:'20px', border:'1px solid var(--border)', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }
  const sTitle = { margin:'0 0 16px', fontSize:13, fontWeight:800, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em', display:'flex', alignItems:'center', gap:6 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Selector período */}
      <div style={card}>
        <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} from={from} to={to} setFrom={setFrom} setTo={setTo}/>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16 }}>
        <div style={{ ...card, borderTop:'4px solid var(--accent)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Total gastado</div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{money(total)}</div>
          <div style={{ marginTop:6, display:'flex', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{periodoLabel}</span>
            <DeltaBadge current={total} prev={totalAnt}/>
          </div>
        </div>
        <div style={{ ...card, borderTop:'4px solid #10b981' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>N° de gastos</div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{gastos.length}</div>
          <div style={{ marginTop:6 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{periodoLabel}</span>
          </div>
        </div>
        <div style={{ ...card, borderTop:'4px solid #f59e0b' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Ticket promedio</div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>
            {money(gastos.length > 0 ? total/gastos.length : 0)}
          </div>
        </div>
        <div style={{ ...card, borderTop:'4px solid #8b5cf6' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>
            Promedio / día
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>
            {money(promDia)}
          </div>
          <div style={{ marginTop:4, display:'flex', alignItems:'center', justifyContent:'flex-start', gap:6 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{dias} día{dias !== 1 ? 's' : ''}</span>
            <DeltaBadge current={promDia} prev={promDiaAnt} />
          </div>
        </div>
      </div>

      {/* ── Banners de alerta ── */}
      <AlertaBanners alertas={alertas} onNavigate={onNavigate} />

      {/* ── Panel Ingresos vs Gastos ── */}
      {totalIngresos > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
          <div style={{ ...card, borderTop:'3px solid #22c55e', padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Ingresos</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#22c55e' }}>{money(totalIngresos)}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{periodoLabel}</div>
          </div>
          <div style={{ ...card, borderTop:`3px solid ${pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e'}`, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>% Gastado</div>
            <div style={{ fontSize:22, fontWeight:800, color:pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e' }}>{pctGastado}%</div>
            <div style={{ marginTop:6, height:5, borderRadius:3, background:'var(--border)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min(pctGastado,100)}%`, borderRadius:3, transition:'width .5s', background:pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e' }}/>
            </div>
          </div>
          <div style={{ ...card, borderTop:`3px solid ${saldoDisp>=0?'#3b82f6':'#ef4444'}`, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Saldo disponible</div>
            <div style={{ fontSize:22, fontWeight:800, color:saldoDisp>=0?'#3b82f6':'#ef4444' }}>{saldoDisp>=0?'+':''}{money(saldoDisp)}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{saldoDisp>=0?'Superávit':'Déficit'} del período</div>
          </div>
          {gastosHormiga.count > 0 && (
            <div style={{ ...card, borderTop:'3px solid #8b5cf6', padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Gastos hormiga</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#8b5cf6' }}>{money(gastosHormiga.total)}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{gastosHormiga.count} gastos pequeños · {gastosHormiga.pct}% del total</div>
            </div>
          )}
        </div>
      )}

      {/* CTA ingresos */}
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

      {/* Sin datos */}
      {gastos.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <IconCalendario size={40} color="var(--text-muted)" style={{ marginBottom: 10 }} aria-hidden="true" />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Sin gastos en este período</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Seleccioná otro rango de fechas o registrá nuevos gastos.</p>
        </div>
      ) : (<>

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          <div style={card}>
            <h3 style={sTitle}><IconTrofeo size={14} weight="fill" color="#f59e0b" aria-hidden="true" /> Top Ítems por Gasto</h3>
            <ItemList items={topGasto} valueKey="monto" fmtValue={money} paletteOffset={0} emptyMsg="Sin ítems registrados en el período." />
          </div>
          <div style={card}>
            <h3 style={sTitle}><IconDinero size={14} aria-hidden="true" /> Top Ítems por Cantidad</h3>
            <ItemList items={topCantidad} valueKey="cantidad" fmtValue={v => v % 1 === 0 ? String(v) : v.toFixed(2)} paletteOffset={3} emptyMsg="Registrá cantidad en tus gastos para ver este ranking." />
          </div>
        </div>

      </>)}
    </div>
  )
}
