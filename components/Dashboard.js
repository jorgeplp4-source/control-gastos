'use client'
import { useMemo, useState, useEffect } from 'react'
import { N1_COLORS, fmt, PERIODOS, getPeriodo, getPeriodoAnterior } from '../lib/constants'
import { useChart, PALETTE, baseOptions } from '../lib/useChart'
import { useApp } from '../context/AppContext'
import { useIngresos } from '../lib/useIngresos'
import { useAlertas, ALERTA_STYLE } from '../lib/useAlertas'
import { IconDinero, IconCalendario, IconTrofeo, IconEtiquetas, IconCaretDown } from '../lib/icons'

const fmtAxis = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`
const n1Color = (name, idx) => (N1_COLORS[name] || {}).bg || PALETTE[idx % PALETTE.length]
const CUR_MONTH = new Date().toISOString().slice(0, 7)

// ── Selector de período ──────────────────────────────────────────────────────
function PeriodSelector({ periodo, setPeriodo, from, to, setFrom, setTo }) {
  const handleSelect = (id) => {
    setPeriodo(id)
    if (id !== 'custom') { const rng = getPeriodo(id); setFrom(rng.from); setTo(rng.to) }
  }
  return (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {PERIODOS.filter(p => p.id !== 'custom').map(p => (
          <button key={p.id} onClick={() => handleSelect(p.id)} aria-pressed={periodo===p.id}
            style={{ padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .15s',
              background: periodo===p.id ? 'var(--accent)' : 'var(--surface2)',
              color:      periodo===p.id ? '#fff'         : 'var(--text-secondary)',
              boxShadow:  periodo===p.id ? '0 2px 8px rgba(99,102,241,.3)' : 'none' }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => handleSelect('custom')} aria-pressed={periodo==='custom'}
          style={{ padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .15s', display:'flex', alignItems:'center', gap:4,
            background: periodo==='custom' ? 'var(--accent)' : 'var(--surface2)',
            color:      periodo==='custom' ? '#fff'         : 'var(--text-secondary)' }}>
          Personalizado <IconCaretDown size={12} aria-hidden="true" />
        </button>
      </div>
      {periodo === 'custom' && (
        <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center', flexWrap:'wrap' }}>
          <label style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding:'5px 9px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-primary)', fontSize:13 }} />
          <label style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding:'5px 9px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-primary)', fontSize:13 }} />
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
        legend: { position:'bottom', ...baseOptions(theme).plugins.legend },
        tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${byN1[ctx.dataIndex].pct}%)` } } },
    },
  }), [JSON.stringify(byN1)])
  return <div style={{ position:'relative', height:220, width:'100%' }}><canvas ref={canvasRef} /></div>
}

// ── Bar horizontal top subcategorías ────────────────────────────────────────
function BarTopN3({ byN3 }) {
  const canvasRef = useChart('bar', (theme) => ({
    data: {
      labels: byN3.map(d => d.name),
      datasets: [{ label:'Gasto', data: byN3.map(d => d.value),
        backgroundColor: byN3.map((_,i) => `${PALETTE[i%PALETTE.length]}cc`),
        borderColor: byN3.map((_,i) => PALETTE[i%PALETTE.length]),
        borderWidth:1.5, borderRadius:6, borderSkipped:false }],
    },
    options: {
      ...baseOptions(theme), indexAxis:'y',
      plugins: { ...baseOptions(theme).plugins, legend:{ display:false },
        tooltip: { ...baseOptions(theme).plugins.tooltip, callbacks:{ label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid:{ color:theme.gridColor, drawBorder:false }, ticks:{ color:theme.textColor, font:{ size:11 }, callback:fmtAxis }, border:{ display:false } },
        y: { grid:{ display:false }, ticks:{ color:theme.textColor, font:{ size:11, weight:'600' } }, border:{ display:false } },
      },
    },
  }), [JSON.stringify(byN3)])
  const h = Math.max(180, byN3.length * 36)
  return <div style={{ position:'relative', height:h, width:'100%' }}><canvas ref={canvasRef} /></div>
}

// ── Badge Δ vs período anterior ──────────────────────────────────────────────
function DeltaBadge({ current, prev }) {
  if (!prev) return null
  const pct = Math.round((current - prev) / prev * 100)
  const up = pct > 0; const zero = pct === 0
  const color = zero ? '#64748b' : up ? '#ef4444' : '#10b981'
  const bg    = zero ? '#f1f5f9' : up ? '#fee2e2' : '#d1fae5'
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:99, background:bg, color, marginLeft:6 }}>
      {zero ? '= igual' : `${up?'▲':'▼'} ${Math.abs(pct)}% vs ant.`}
    </span>
  )
}

// ── Lista de ítems ────────────────────────────────────────────────────────────
function ItemList({ items, valueKey, fmtValue, paletteOffset=0, emptyMsg }) {
  if (!items.length) return (
    <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'24px 0', margin:0 }}>{emptyMsg}</p>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map((item, i) => {
        const color = PALETTE[(i + paletteOffset) % PALETTE.length]
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>
              {i+1}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{item.subtitle}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontWeight:800, color, fontSize:14, lineHeight:1 }}>{fmtValue(item[valueKey])}</div>
              {item.sublabel && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{item.sublabel}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Alertas ───────────────────────────────────────────────────────────────────
function AlertaBanners({ alertas, onNavigate }) {
  const [cerradas, setCerradas] = useState(() => {
    try { const s = sessionStorage.getItem('alertas_cerradas'); return new Set(s ? JSON.parse(s) : []) } catch { return new Set() }
  })
  if (!alertas?.length) return null
  const cerrar = (id) => {
    setCerradas(prev => {
      const next = new Set([...prev, id])
      try { sessionStorage.setItem('alertas_cerradas', JSON.stringify([...next])) } catch {}
      return next
    })
  }
  const mostrar = [...alertas.filter(a => a.severidad==='critica' && !cerradas.has(a.id)),
    ...alertas.filter(a => a.severidad==='advertencia' && !cerradas.has(a.id))].slice(0,3)
  if (!mostrar.length) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {mostrar.map(a => {
        const s = ALERTA_STYLE[a.severidad]
        return (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
            background:s.bg, border:`1px solid ${s.border}`, borderLeft:`4px solid ${s.color}`, borderRadius:10 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{s.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{a.titulo}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{a.detalle}</div>
            </div>
            {a.pct !== undefined && (
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:s.color }}>{Math.min(a.pct,999)}%</div>
                <div style={{ width:50, height:3, borderRadius:2, background:'#e2e8f0', overflow:'hidden', marginTop:3 }}>
                  <div style={{ height:'100%', width:`${Math.min(a.pct,100)}%`, background:s.color, borderRadius:2 }}/>
                </div>
              </div>
            )}
            <button onClick={() => cerrar(a.id)} title="Cerrar"
              style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', fontSize:14, lineHeight:1, padding:'2px 4px', flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.color = s.color}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>✕</button>
          </div>
        )
      })}
      {alertas.filter(a => !cerradas.has(a.id)).length > 3 && (
        <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
          +{alertas.filter(a => !cerradas.has(a.id)).length - 3} alertas más en la campana 🔔
        </div>
      )}
    </div>
  )
}

// ── Widget Shell — título + colapso por widget ────────────────────────────────
function WidgetShell({ id, title, icon, collapsible=true, children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(`dash_w_${id}`) === '1' } catch { return false }
  })
  const toggle = () => setCollapsed(prev => {
    const next = !prev
    try { localStorage.setItem(`dash_w_${id}`, next ? '1' : '0') } catch {}
    return next
  })
  return (
    <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', boxShadow:'0 1px 8px rgba(0,0,0,.05)', height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px',
        borderBottom: collapsed ? 'none' : '1px solid var(--border)' }}>
        <h3 style={{ margin:0, fontSize:12, fontWeight:800, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em', display:'flex', alignItems:'center', gap:5 }}>
          {icon}{title}
        </h3>
        {collapsible && (
          <button onClick={toggle} title={collapsed ? 'Expandir' : 'Minimizar'} aria-expanded={!collapsed}
            style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px 4px', borderRadius:4, display:'flex', lineHeight:1, transition:'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
            <IconCaretDown size={13} aria-hidden="true"
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition:'transform .2s' }} />
          </button>
        )}
      </div>
      {!collapsed && <div style={{ padding:'14px 16px', flex:1 }}>{children}</div>}
    </div>
  )
}

// ── Widget Manager — panel inline de visibilidad y orden ─────────────────────
function WidgetManager({ widgets, onSave, onClose, isMobile }) {
  const moveWidget = async (i, dir) => {
    const next = [...widgets]
    const t = i + dir
    if (t < 0 || t >= next.length) return
    ;[next[i], next[t]] = [next[t], next[i]]
    await onSave(next)
  }

  return (
    <div style={{ background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border)', padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>
          Personalizar widgets
        </span>
        <button onClick={onClose}
          style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, lineHeight:1, padding:'2px 5px', borderRadius:4 }}>✕</button>
      </div>

      {isMobile ? (
        /* Mobile: lista con toggle + ↑↓ */
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {widgets.map((w, i) => (
            <div key={w.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'var(--surface)', borderRadius:9, border:'1px solid var(--border)' }}>
              <span style={{ flex:1, fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {w.label}
              </span>
              {w.alwaysOn ? (
                <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>Siempre</span>
              ) : (
                <button
                  onClick={async () => {
                    const next = widgets.map((x, j) => j === i ? { ...x, visible: !x.visible } : x)
                    await onSave(next)
                  }}
                  style={{ padding:'3px 10px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, flexShrink:0, transition:'all .15s',
                    background: w.visible ? 'var(--accent)' : 'var(--surface2)',
                    color:      w.visible ? '#fff'          : 'var(--text-muted)' }}>
                  {w.visible ? '✓' : '—'}
                </button>
              )}
              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                <button onClick={() => moveWidget(i, -1)} disabled={i === 0}
                  style={{ padding:'3px 7px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface2)', cursor: i===0 ? 'not-allowed':'pointer',
                    color:'var(--text-muted)', fontSize:13, opacity: i===0 ? 0.3 : 1, lineHeight:1 }}>↑</button>
                <button onClick={() => moveWidget(i, 1)} disabled={i === widgets.length - 1}
                  style={{ padding:'3px 7px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface2)', cursor: i===widgets.length-1 ? 'not-allowed':'pointer',
                    color:'var(--text-muted)', fontSize:13, opacity: i===widgets.length-1 ? 0.3 : 1, lineHeight:1 }}>↓</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: pills para toggle + hint de arrastre */
        <>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {widgets.map((w, i) => w.alwaysOn ? null : (
              <button key={w.id}
                onClick={async () => {
                  const next = widgets.map((x, j) => j === i ? { ...x, visible: !x.visible } : x)
                  await onSave(next)
                }}
                style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all .15s',
                  background: w.visible ? 'var(--accent)' : 'var(--surface)',
                  color:      w.visible ? '#fff'          : 'var(--text-muted)',
                  outline:    `1.5px solid ${w.visible ? 'var(--accent)' : 'var(--border)'}` }}>
                {w.visible ? '✓ ' : ''}{w.label}
              </button>
            ))}
          </div>
          <p style={{ margin:'8px 0 0', fontSize:11, color:'var(--text-muted)' }}>
            ⠿ Arrastrá las tarjetas para cambiar el orden.
          </p>
        </>
      )}
    </div>
  )
}

// ── Mini widget: Cuotas activas ───────────────────────────────────────────────
function CuotasWidget({ gastos, money, onNavigate }) {
  const compras = useMemo(() => {
    const cuotas = gastos.filter(g => g.compra_id && g.cuotas_total > 1)
    const map = {}
    cuotas.forEach(g => {
      if (!map[g.compra_id]) map[g.compra_id] = {
        id: g.compra_id, nombre: g.n4||g.n3||g.n2||g.n1||'Compra',
        medio_pago: g.medio_pago||'', cuotas_total: g.cuotas_total, lista: [],
      }
      map[g.compra_id].lista.push(g)
    })
    return Object.values(map).map(c => {
      const sorted  = c.lista.sort((a,b) => (a.cuota_numero||0)-(b.cuota_numero||0))
      const pagadas = sorted.filter(q => q.fecha?.slice(0,7) < CUR_MONTH).length
      const pend    = sorted.filter(q => q.fecha?.slice(0,7) >= CUR_MONTH)
      const deuda   = pend.reduce((s,q) => s+(q.monto||0), 0)
      const actual  = sorted.find(q => q.fecha?.slice(0,7) === CUR_MONTH)
      return { ...c, sorted, pagadas, deuda, actual }
    }).filter(c => c.deuda > 0).sort((a,b) => b.deuda - a.deuda)
  }, [gastos])

  const totalDeuda     = compras.reduce((s,c) => s+c.deuda, 0)
  const cuotasEsteMes  = compras.filter(c => c.actual).length

  if (compras.length === 0) return (
    <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
      💳 Sin compras en cuotas activas
    </div>
  )

  const kpiSub = { background:'var(--surface2)', borderRadius:10, padding:'10px 12px', border:'1px solid var(--border)' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        <div style={{ ...kpiSub, borderTop:'3px solid #ef4444' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Deuda</div>
          <div style={{ fontSize:17, fontWeight:800, color:'#ef4444', lineHeight:1 }}>{money(totalDeuda)}</div>
        </div>
        <div style={{ ...kpiSub, borderTop:'3px solid var(--accent)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Este mes</div>
          <div style={{ fontSize:17, fontWeight:800, color:'var(--accent)', lineHeight:1 }}>{cuotasEsteMes} cuota{cuotasEsteMes!==1?'s':''}</div>
        </div>
        <div style={{ ...kpiSub, borderTop:'3px solid #f59e0b' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Activas</div>
          <div style={{ fontSize:17, fontWeight:800, color:'#f59e0b', lineHeight:1 }}>{compras.length}</div>
        </div>
      </div>

      {/* Lista de compras */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {compras.slice(0, 4).map(c => {
          const pct = Math.round(c.pagadas / c.cuotas_total * 100)
          return (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', background:'var(--surface2)', borderRadius:9, border:'1px solid var(--border)' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{c.nombre}</span>
                  <span style={{ color:'#ef4444', flexShrink:0, marginLeft:8 }}>{money(c.deuda)}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                  <div style={{ flex:1, height:3, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent)', borderRadius:99 }} />
                  </div>
                  <span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>{c.pagadas}/{c.cuotas_total}</span>
                  {c.actual && <span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>→ {money(c.actual.monto)}/mes</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={() => onNavigate?.('cuotas')}
        style={{ width:'100%', padding:'7px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
        Ver todas las cuotas →
      </button>
    </div>
  )
}

// ── Mini widget: Inflación personal ───────────────────────────────────────────
function InflacionWidget({ gastos, onNavigate }) {
  const { items, promedio } = useMemo(() => {
    const conCant = gastos.filter(g => g.cantidad > 0 && g.monto > 0)
    if (conCant.length < 5) return { items: [], promedio: 0 }

    const byNombreMes = {}
    conCant.forEach(g => {
      const nombre = g.n4||g.n3||g.n2||g.n1||'Otros'
      const mes = g.fecha?.slice(0, 7)
      if (!mes) return
      if (!byNombreMes[nombre]) byNombreMes[nombre] = {}
      if (!byNombreMes[nombre][mes]) byNombreMes[nombre][mes] = { monto:0, cant:0 }
      byNombreMes[nombre][mes].monto += g.monto||0
      byNombreMes[nombre][mes].cant  += parseFloat(g.cantidad)||0
    })

    const items = Object.entries(byNombreMes).map(([nombre, meses]) => {
      const mesArr = Object.keys(meses).sort()
      if (mesArr.length < 2) return null
      const p0 = meses[mesArr[0]].monto / meses[mesArr[0]].cant
      const p1 = meses[mesArr[mesArr.length-1]].monto / meses[mesArr[mesArr.length-1]].cant
      const variacion = ((p1 - p0) / p0) * 100
      return { nombre, variacion, meses: mesArr.length, p0, p1 }
    }).filter(Boolean).sort((a,b) => b.variacion - a.variacion)

    const promedio = items.length ? items.reduce((s,x) => s+x.variacion, 0) / items.length : 0
    return { items, promedio }
  }, [gastos])

  if (items.length === 0) return (
    <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
      📊 Registrá gastos con cantidad para ver tu inflación personal
    </div>
  )

  const pColor = promedio > 100 ? '#ef4444' : promedio > 50 ? '#f59e0b' : promedio > 20 ? '#f59e0b' : '#10b981'
  const kpiSub = { background:'var(--surface2)', borderRadius:10, padding:'10px 12px', border:'1px solid var(--border)' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
        <div style={{ ...kpiSub, borderTop:`3px solid ${pColor}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Inflación prom.</div>
          <div style={{ fontSize:17, fontWeight:800, color:pColor, lineHeight:1 }}>{promedio>=0?'+':''}{promedio.toFixed(1)}%</div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>desde primer registro</div>
        </div>
        <div style={{ ...kpiSub, borderTop:'3px solid #8b5cf6' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Ítems analizados</div>
          <div style={{ fontSize:17, fontWeight:800, color:'#8b5cf6', lineHeight:1 }}>{items.length}</div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>con 2+ meses de datos</div>
        </div>
      </div>

      {/* Top inflados */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Más inflados</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {items.slice(0, 5).map(item => {
            const c = item.variacion > 100 ? '#ef4444' : item.variacion > 50 ? '#f59e0b' : item.variacion > 0 ? '#f59e0b' : '#10b981'
            return (
              <div key={item.nombre} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nombre}</div>
                <span style={{ fontSize:12, fontWeight:800, color:c, flexShrink:0 }}>
                  {item.variacion > 0 ? '▲' : '▼'} {Math.abs(item.variacion).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <button onClick={() => onNavigate?.('inflacion')}
        style={{ width:'100%', padding:'7px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
        Ver análisis completo →
      </button>
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────────────────────────
export default function Dashboard({ gastos: todosLosGastos, onNavigate, alertas = [] }) {
  const { fmtMoney, dashboardWidgets, saveDashboardWidgets } = useApp()
  const { ingresos } = useIngresos()
  const money = fmtMoney

  const [periodo, setPeriodo] = useState('mes')
  const initRng = getPeriodo('mes')
  const [from, setFrom]       = useState(initRng.from)
  const [to,   setTo]         = useState(initRng.to)
  const [showManager, setShowManager] = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  const [draggedId, setDraggedId]     = useState(null)
  const [dragOverId, setDragOverId]   = useState(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Drag & drop para reordenar widgets ──
  const handleDragEnd = async () => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const next = [...dashboardWidgets]
      const fi = next.findIndex(w => w.id === draggedId)
      const ti = next.findIndex(w => w.id === dragOverId)
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      await saveDashboardWidgets(next)
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  // ── Datos del período ──
  const gastos = useMemo(() => todosLosGastos.filter(g => g.fecha >= from && g.fecha <= to), [todosLosGastos, from, to])
  const gastosAnt = useMemo(() => {
    const ant = getPeriodoAnterior({ from, to })
    return todosLosGastos.filter(g => g.fecha >= ant.from && g.fecha <= ant.to)
  }, [todosLosGastos, from, to])

  const total    = useMemo(() => gastos.reduce((s,g) => s+(g.monto||0), 0), [gastos])
  const totalAnt = useMemo(() => gastosAnt.reduce((s,g) => s+(g.monto||0), 0), [gastosAnt])
  const dias     = useMemo(() => { const d = new Date(to)-new Date(from); return Math.max(1, Math.round(d/86400000)+1) }, [from, to])
  const promDia  = total / dias
  const diasAnt  = useMemo(() => { const ant = getPeriodoAnterior({from,to}); const d = new Date(ant.to)-new Date(ant.from); return Math.max(1,Math.round(d/86400000)+1) }, [from,to])
  const promDiaAnt = totalAnt / diasAnt

  const byN1 = useMemo(() => {
    const map = {}
    gastos.forEach(g => { map[g.n1]=(map[g.n1]||0)+(g.monto||0) })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name,value]) => ({ name, value, pct: total>0?Math.round(value/total*100):0 }))
  }, [gastos, total])

  const byN3 = useMemo(() => {
    const map = {}
    gastos.forEach(g => { const k=g.n3||g.n2||g.n1; map[k]=(map[k]||0)+(g.monto||0) })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  }, [gastos])

  const topGasto = useMemo(() => {
    const map = {}
    gastos.forEach(g => {
      const k = g.n4||g.n3||g.n2||g.n1
      if (!map[k]) map[k] = { name:k, monto:0, count:0, subtitle:g.n1 }
      map[k].monto += g.monto||0; map[k].count++
    })
    return Object.values(map).sort((a,b)=>b.monto-a.monto).slice(0,8).map(x=>({...x, sublabel:`${x.count} compra${x.count!==1?'s':''}`}))
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

  const totalIngresos = useMemo(() =>
    ingresos.filter(i => i.fecha>=from && i.fecha<=to).reduce((s,i)=>s+(i.monto||0),0),
    [ingresos, from, to]
  )
  const saldoDisp  = totalIngresos - total
  const pctGastado = totalIngresos > 0 ? Math.round(total/totalIngresos*100) : 0
  const gastosHormiga = useMemo(() => {
    const MAX = Math.max(1500, total*0.008)
    const h = gastos.filter(g=>g.monto>0&&g.monto<=MAX)
    const tot = h.reduce((s,g)=>s+g.monto,0)
    return { count:h.length, total:tot, pct: total>0?Math.round(tot/total*100):0 }
  }, [gastos, total])

  // ── Renderizador de widgets ────────────────────────────────────────────────
  const card = { background:'var(--surface)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)', boxShadow:'0 1px 8px rgba(0,0,0,.05)' }
  const kpiCard = (color) => ({ background:'var(--surface2)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)', borderTop:`3px solid ${color}` })

  const renderWidget = (id) => {
    switch (id) {

      case 'kpis':
        return (
          <WidgetShell id="kpis" title="Métricas principales">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
              <div style={kpiCard('var(--accent)')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Total gastado</div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{money(total)}</div>
                <div style={{ marginTop:5, display:'flex', alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{periodoLabel}</span>
                  <DeltaBadge current={total} prev={totalAnt}/>
                </div>
              </div>
              <div style={kpiCard('#10b981')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>N° gastos</div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{gastos.length}</div>
                <div style={{ marginTop:5 }}><span style={{ fontSize:10, color:'var(--text-muted)' }}>{periodoLabel}</span></div>
              </div>
              <div style={kpiCard('#f59e0b')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Ticket prom.</div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>
                  {money(gastos.length > 0 ? total/gastos.length : 0)}
                </div>
              </div>
              <div style={kpiCard('#8b5cf6')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Prom./día</div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{money(promDia)}</div>
                <div style={{ marginTop:5, display:'flex', alignItems:'center', flexWrap:'wrap', gap:4 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{dias} día{dias!==1?'s':''}</span>
                  <DeltaBadge current={promDia} prev={promDiaAnt}/>
                </div>
              </div>
            </div>
          </WidgetShell>
        )

      case 'alertas':
        return (
          <div>
            <AlertaBanners alertas={alertas} onNavigate={onNavigate} />
          </div>
        )

      case 'ingresos_gastos': {
        if (totalIngresos === 0 && gastos.length === 0) return null
        if (totalIngresos === 0) return (
          <div style={{ ...card, background:'#eff6ff', border:'1px solid #bfdbfe', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
            onClick={() => onNavigate?.('ingresos')}>
            <span style={{ fontSize:20 }}>💡</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e40af' }}>Registrá tus ingresos para ver el % gastado y saldo disponible</div>
              <div style={{ fontSize:12, color:'#3b82f6', marginTop:1 }}>Ir a Ingresos →</div>
            </div>
          </div>
        )
        return (
          <WidgetShell id="ingresos_gastos" title="Ingresos vs Gastos">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10 }}>
              <div style={kpiCard('#22c55e')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Ingresos</div>
                <div style={{ fontSize:19, fontWeight:800, color:'#22c55e' }}>{money(totalIngresos)}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{periodoLabel}</div>
              </div>
              <div style={kpiCard(pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>% Gastado</div>
                <div style={{ fontSize:19, fontWeight:800, color:pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e' }}>{pctGastado}%</div>
                <div style={{ marginTop:5, height:4, borderRadius:3, background:'var(--border)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(pctGastado,100)}%`, borderRadius:3, transition:'width .5s', background:pctGastado>90?'#ef4444':pctGastado>70?'#f59e0b':'#22c55e' }}/>
                </div>
              </div>
              <div style={kpiCard(saldoDisp>=0?'#3b82f6':'#ef4444')}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Saldo</div>
                <div style={{ fontSize:19, fontWeight:800, color:saldoDisp>=0?'#3b82f6':'#ef4444' }}>{saldoDisp>=0?'+':''}{money(saldoDisp)}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{saldoDisp>=0?'Superávit':'Déficit'}</div>
              </div>
              {gastosHormiga.count > 0 && (
                <div style={kpiCard('#8b5cf6')}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:3 }}>Hormiga</div>
                  <div style={{ fontSize:19, fontWeight:800, color:'#8b5cf6' }}>{money(gastosHormiga.total)}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{gastosHormiga.count} gastos · {gastosHormiga.pct}%</div>
                </div>
              )}
            </div>
          </WidgetShell>
        )
      }

      case 'cuotas':
        return (
          <WidgetShell id="cuotas" title="Cuotas activas" icon={<span style={{ fontSize:12 }}>💳</span>}>
            <CuotasWidget gastos={todosLosGastos} money={money} onNavigate={onNavigate} />
          </WidgetShell>
        )

      case 'inflacion':
        return (
          <WidgetShell id="inflacion" title="Inflación personal" icon={<span style={{ fontSize:12 }}>📊</span>}>
            <InflacionWidget gastos={todosLosGastos} onNavigate={onNavigate} />
          </WidgetShell>
        )

      case 'distribucion':
        return (
          <WidgetShell id="distribucion" title="Distribución por Tipo" icon={<IconEtiquetas size={13} aria-hidden="true" />}>
            {byN1.length > 0 ? (
              <>
                <DoughnutN1 byN1={byN1} />
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:7 }}>
                  {byN1.map(({ name, value, pct }, i) => {
                    const c = N1_COLORS[name] || { bg: n1Color(name,i) }
                    return (
                      <div key={name}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                          <span style={{ fontWeight:700, color:c.text||c.bg }}>{name}</span>
                          <span style={{ color:'var(--text-muted)' }}>{money(value)} <b style={{ color:c.bg }}>({pct}%)</b></span>
                        </div>
                        <div style={{ height:4, background:'var(--border)', borderRadius:99 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:c.bg, borderRadius:99, transition:'width .5s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'24px 0', margin:0 }}>Sin gastos en el período.</p>
            )}
          </WidgetShell>
        )

      case 'top_subcategorias':
        return (
          <WidgetShell id="top_subcategorias" title="Top Subcategorías">
            {byN3.length > 0
              ? <BarTopN3 byN3={byN3} />
              : <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'24px 0', margin:0 }}>Sin datos suficientes.</p>
            }
          </WidgetShell>
        )

      case 'top_items_gasto':
        return (
          <WidgetShell id="top_items_gasto" title="Top Ítems por Gasto" icon={<IconTrofeo size={13} weight="fill" color="#f59e0b" aria-hidden="true" />}>
            <ItemList items={topGasto} valueKey="monto" fmtValue={money} paletteOffset={0} emptyMsg="Sin ítems en el período." />
          </WidgetShell>
        )

      case 'top_items_cantidad':
        return (
          <WidgetShell id="top_items_cantidad" title="Top Ítems por Cantidad" icon={<IconDinero size={13} aria-hidden="true" />}>
            <ItemList items={topCantidad} valueKey="cantidad" fmtValue={v => v%1===0?String(v):v.toFixed(2)} paletteOffset={3} emptyMsg="Registrá cantidad en tus gastos para ver este ranking." />
          </WidgetShell>
        )

      default: return null
    }
  }

  const visibles = dashboardWidgets.filter(w => w.visible)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Selector de período + botón Personalizar */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1 }}>
            <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} from={from} to={to} setFrom={setFrom} setTo={setTo} />
          </div>
          <button
            onClick={() => setShowManager(p => !p)}
            title="Personalizar widgets del dashboard"
            style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid var(--border)', background: showManager ? 'var(--accent)' : 'transparent',
              color: showManager ? '#fff' : 'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0,
              display:'flex', alignItems:'center', gap:4, transition:'all .15s' }}>
            ⚙ <span style={{ display: isMobile ? 'none' : 'inline' }}>Widgets</span>
          </button>
        </div>

        {/* Panel inline de personalización */}
        {showManager && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
            <WidgetManager widgets={dashboardWidgets} onSave={saveDashboardWidgets} onClose={() => setShowManager(false)} isMobile={isMobile} />
          </div>
        )}
      </div>

      {/* Grid de widgets */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap:12 }}>
        {visibles.map(w => {
          if (w.id === 'periodo') return null // ya renderizado arriba
          const content = renderWidget(w.id)
          if (!content) return null
          const isDragging = !isMobile && draggedId === w.id
          const isOver     = !isMobile && dragOverId === w.id && draggedId !== w.id
          return (
            <div
              key={w.id}
              draggable={!isMobile}
              onDragStart={!isMobile ? () => setDraggedId(w.id) : undefined}
              onDragOver={!isMobile ? (e) => { e.preventDefault(); if (dragOverId !== w.id) setDragOverId(w.id) } : undefined}
              onDragEnd={!isMobile ? handleDragEnd : undefined}
              onDrop={!isMobile ? (e) => e.preventDefault() : undefined}
              style={{
                gridColumn:  (isMobile || w.fullWidth) ? '1 / -1' : undefined,
                opacity:     isDragging ? 0.4 : 1,
                outline:     isOver ? '2px dashed var(--accent)' : '2px solid transparent',
                borderRadius: 14,
                transition:  'opacity .15s',
                cursor:      !isMobile ? 'grab' : 'default',
                userSelect:  'none',
              }}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
