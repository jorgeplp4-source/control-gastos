'use client'
import { useState, useMemo, useRef, useCallback } from 'react'
import { N1_COLORS, fmt, fmtDate, uniq, PERIODOS, getPeriodo } from '../lib/constants'
import { useApp } from '../context/AppContext'
import {
  IconEditar, IconEliminar, IconBuscar, IconCerrar,
  IconDinero, IconRecibo, IconCalendario, IconTop,
  IconOrdenar, IconArriba, IconAbajo, IconFiltros,
  IconAdvertencia, IconCaretDown, IconCaretRight,
} from '../lib/icons'

// ── Columnas ─────────────────────────────────────────────────────────────────
const ALL_COLS = [
  { id:'monto',    label:'Monto',     field:'monto',  sortable:true  },
  { id:'n4',       label:'Ítem',      field:'n4',     sortable:true  },
  { id:'cantidad', label:'Cantidad',  field:null,     sortable:false },
  { id:'n1',       label:'Tipo',      field:'n1',     sortable:true  },
  { id:'n2',       label:'Área',      field:'n2',     sortable:true  },
  { id:'n3',       label:'Subcateg.', field:'n3',     sortable:true  },
  { id:'fecha',    label:'Fecha',     field:'fecha',  sortable:true  },
  { id:'nota',     label:'Nota',      field:null,     sortable:false },
  { id:'acciones', label:'',          field:null,     sortable:false },
]
const DEFAULT_ORDER = ['monto','n4','cantidad','n1','n2','n3','fecha','nota','acciones']
const LS_KEY = 'listview_col_order'

function loadOrder(settings) {
  if (settings?.col_order?.length) return settings.col_order
  try { const s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s) } catch {}
  return DEFAULT_ORDER
}

// ── DrillDown sidebar ─────────────────────────────────────────────────────────
function DrillDown({ gastos, activeN1, activeN2, activeN3, onFilter }) {
  const { fmtMoney } = useApp()
  const [openN1, setOpenN1] = useState(activeN1 || null)
  const [openN2, setOpenN2] = useState(activeN2 || null)

  const totalAll = gastos.reduce((s, g) => s + (g.monto || 0), 0)

  const byN1 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { if (g.n1) m[g.n1] = (m[g.n1] || 0) + (g.monto || 0) })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [gastos])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      {/* "Todos" row */}
      <div onClick={() => { onFilter({ n1:'', n2:'', n3:'' }); setOpenN1(null); setOpenN2(null) }}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 8px', borderRadius:7, cursor:'pointer',
          background: !activeN1 ? 'var(--accent-light)' : 'transparent',
          border: !activeN1 ? '1.5px solid var(--accent)' : '1.5px solid transparent',
          fontWeight: !activeN1 ? 700 : 500, fontSize:12, color: !activeN1 ? 'var(--accent)' : 'var(--text-secondary)',
        }}>
        <span style={{ fontSize:10 }}>⊞</span> Todos
      </div>

      {byN1.map(([n1, v]) => {
        const c   = N1_COLORS[n1] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
        const pct = totalAll ? Math.round(v / totalAll * 100) : 0
        const isOpen = openN1 === n1
        const isActive = activeN1 === n1 && !activeN2

        // N2 under this N1
        const byN2 = {}
        gastos.filter(g => g.n1 === n1).forEach(g => { if (g.n2) byN2[g.n2] = (byN2[g.n2] || 0) + (g.monto || 0) })
        const n2entries = Object.entries(byN2).sort((a, b) => b[1] - a[1])

        return (
          <div key={n1}>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 8px', borderRadius:7, cursor:'pointer',
              background: isActive ? c.light : 'transparent',
              border: `1.5px solid ${isActive ? c.bg : 'transparent'}`,
              transition:'all .1s', userSelect:'none',
            }}>
              <span onClick={() => setOpenN1(isOpen ? null : n1)}
                style={{ color:'var(--text-muted)', fontSize:9, flexShrink:0, padding:'0 2px' }}>
                {isOpen ? <IconCaretDown size={9} aria-hidden="true" /> : <IconCaretRight size={9} aria-hidden="true" />}
              </span>
              <span style={{ width:7, height:7, borderRadius:'50%', background:c.bg, flexShrink:0 }} />
              <span onClick={() => { onFilter({ n1, n2:'', n3:'' }); setOpenN1(n1) }}
                style={{ flex:1, fontSize:12, fontWeight:700, color: isActive ? c.bg : 'var(--text-primary)' }}>
                {n1}
              </span>
              <span style={{ fontSize:10, fontWeight:800, color:c.bg }}>{pct}%</span>
            </div>

            {isOpen && n2entries.map(([n2, v2]) => {
              const isActiveN2 = activeN1 === n1 && activeN2 === n2 && !activeN3
              const pct2 = v ? Math.round(v2 / v * 100) : 0

              // N3 under this N2
              const byN3 = {}
              gastos.filter(g => g.n1 === n1 && g.n2 === n2).forEach(g => { if (g.n3) byN3[g.n3] = (byN3[g.n3] || 0) + (g.monto || 0) })
              const n3entries = Object.entries(byN3).sort((a, b) => b[1] - a[1])
              const isOpenN2here = openN2 === `${n1}/${n2}`

              return (
                <div key={n2}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px 4px 20px', borderRadius:6, cursor:'pointer',
                    background: isActiveN2 ? c.light : 'transparent',
                    border: `1.5px solid ${isActiveN2 ? c.bg+'50' : 'transparent'}`,
                    userSelect:'none',
                  }}>
                    {n3entries.length > 0 && (
                      <span onClick={() => setOpenN2(isOpenN2here ? null : `${n1}/${n2}`)}
                        style={{ color:'var(--text-muted)', fontSize:9, flexShrink:0 }}>
                        {isOpenN2here ? <IconCaretDown size={9} aria-hidden="true" /> : <IconCaretRight size={9} aria-hidden="true" />}
                      </span>
                    )}
                    <span onClick={() => onFilter({ n1, n2, n3:'' })}
                      style={{ flex:1, fontSize:11, color: isActiveN2 ? c.bg : 'var(--text-secondary)', fontWeight: isActiveN2 ? 700 : 500 }}>
                      {n2}
                    </span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{pct2}%</span>
                  </div>

                  {isOpenN2here && n3entries.map(([n3, v3]) => {
                    const isActiveN3 = activeN1 === n1 && activeN2 === n2 && activeN3 === n3
                    const pct3 = v2 ? Math.round(v3 / v2 * 100) : 0
                    return (
                      <div key={n3} onClick={() => onFilter({ n1, n2, n3 })}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px 3px 32px', borderRadius:6, cursor:'pointer',
                          background: isActiveN3 ? c.light : 'transparent',
                          border: `1.5px solid ${isActiveN3 ? c.bg+'30' : 'transparent'}`,
                          userSelect:'none',
                        }}>
                        <span style={{ flex:1, fontSize:11, color: isActiveN3 ? c.bg : 'var(--text-muted)', fontStyle:'italic' }}>{n3}</span>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{pct3}%</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Column header draggable ───────────────────────────────────────────────────
function ColHeader({ col, sortField, sortDir, onSort, dragOver, onDragStart, onDragOver, onDrop }) {
  return (
    <th
      draggable={col.id !== 'acciones'}
      onDragStart={() => onDragStart(col.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(col.id) }}
      onDrop={() => onDrop(col.id)}
      onDragLeave={() => onDragOver(null)}
      onClick={col.sortable ? () => onSort(col.field) : undefined}
      style={{
        padding:'9px 12px', textAlign:'left', fontWeight:800,
        color: dragOver ? 'var(--accent)' : 'var(--text-muted)',
        fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em',
        whiteSpace:'nowrap', borderBottom:'2px solid var(--border)',
        cursor: col.sortable ? 'pointer' : (col.id !== 'acciones' ? 'grab' : 'default'),
        userSelect:'none',
        background: dragOver ? 'var(--accent-light)' : 'var(--surface2)',
        borderRight: dragOver ? '2px solid var(--accent)' : undefined,
        transition:'background .1s',
      }}>
      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
        {col.id !== 'acciones' && (
          <span style={{ opacity:0.25, fontSize:9, fontWeight:400 }}>⠿</span>
        )}
        {col.label}
        {col.sortable && (sortField === col.field
          ? (sortDir === 'asc' ? <IconArriba size={9} weight="bold" aria-label="asc" /> : <IconAbajo size={9} weight="bold" aria-label="desc" />)
          : <IconOrdenar size={9} color="var(--text-muted)" />
        )}
      </span>
    </th>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ListView({ gastos, onDelete, onEdit }) {
  const { fmtMoney, saveSettings, settings } = useApp()

  // Col order persisted
  const [colOrder, setColOrder] = useState(() => loadOrder(settings))
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const applyColOrder = (newOrder) => {
    setColOrder(newOrder)
    try { localStorage.setItem(LS_KEY, JSON.stringify(newOrder)) } catch {}
    saveSettings?.({ col_order: newOrder })
  }

  const handleDrop = (targetId) => {
    if (!dragFrom || dragFrom === targetId) { setDragFrom(null); setDragOver(null); return }
    const arr = [...colOrder]
    const from = arr.indexOf(dragFrom), to = arr.indexOf(targetId)
    arr.splice(from, 1); arr.splice(to, 0, dragFrom)
    applyColOrder(arr)
    setDragFrom(null); setDragOver(null)
  }

  // Filtros
  const [activeN1, setActiveN1]   = useState('')
  const [activeN2, setActiveN2]   = useState('')
  const [activeN3, setActiveN3]   = useState('')
  const [fFrom, setFFrom]         = useState(() => getPeriodo('mes').from)
  const [fTo, setFTo]             = useState(() => getPeriodo('mes').to)
  const [search, setSearch]       = useState('')
  const [periodo, setPeriodo]     = useState('mes')
  const [sortField, setSortField] = useState('fecha')
  const [sortDir, setSortDir]     = useState('desc')
  const [confirmId, setConfirmId] = useState(null)

  const handlePeriodo = (id) => {
    setPeriodo(id)
    if (id !== 'custom') { const { from, to } = getPeriodo(id); setFFrom(from); setFTo(to) }
  }
  const handleFilter = ({ n1, n2, n3 }) => { setActiveN1(n1); setActiveN2(n2); setActiveN3(n3) }
  const handleSort   = (field) => {
    if (!field) return
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const cols = useMemo(() =>
    colOrder.map(id => ALL_COLS.find(c => c.id === id)).filter(Boolean),
    [colOrder])

  const filtered = useMemo(() => {
    let list = gastos.filter(g => {
      if (activeN1 && g.n1 !== activeN1) return false
      if (activeN2 && g.n2 !== activeN2) return false
      if (activeN3 && g.n3 !== activeN3) return false
      if (fFrom && g.fecha < fFrom) return false
      if (fTo   && g.fecha > fTo  ) return false
      if (search) {
        const q = search.toLowerCase()
        if (![g.n1,g.n2,g.n3,g.n4,g.observaciones].some(v => (v||'').toLowerCase().includes(q))) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (sortField === 'monto') { va = parseFloat(va)||0; vb = parseFloat(vb)||0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [gastos, activeN1, activeN2, activeN3, fFrom, fTo, search, sortField, sortDir])

  const total = filtered.reduce((s, g) => s + (g.monto || 0), 0)
  const avg   = filtered.length ? total / filtered.length : 0
  const maxG  = filtered.length ? filtered.reduce((m, g) => (g.monto||0) > (m.monto||0) ? g : m, filtered[0]) : null
  const hayFiltros = activeN1 || search || periodo !== 'mes'

  const S = {
    card:  { background:'var(--surface)', borderRadius:12, padding:'12px 16px', boxShadow:'var(--shadow)', border:'1px solid var(--border)' },
    st:    { fontSize:10, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 },
    inp:   { padding:'7px 11px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, outline:'none', background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit' },
    chip:  { padding:'5px 12px', borderRadius:99, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', transition:'all .12s' },
    chipA: { background:'var(--accent)', borderColor:'var(--accent)', color:'#fff', fontWeight:800 },
  }

  if (!gastos.length) return (
    <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--text-muted)' }}>
      <IconRecibo size={56} weight="duotone" color="var(--text-muted)" style={{ marginBottom:12 }} aria-hidden="true" />
      <h2 style={{ color:'var(--text-secondary)', marginTop:8 }}>Sin gastos registrados</h2>
    </div>
  )

  return (
    <div style={{ display:'flex', gap:14 }}>

      {/* Sidebar drill-down */}
      <div style={{ width:186, flexShrink:0 }}>
        <div style={{ ...S.card, padding:'12px 10px', position:'sticky', top:0 }}>
          <div style={{ ...S.st, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span><IconFiltros size={10} style={{ marginRight:3 }} aria-hidden="true" />Filtrar</span>
            {activeN1 && (
              <button onClick={() => handleFilter({ n1:'', n2:'', n3:'' })}
                style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', fontSize:9, fontWeight:700, padding:0 }}>
                ✕ limpiar
              </button>
            )}
          </div>
          <DrillDown
            gastos={gastos}
            activeN1={activeN1} activeN2={activeN2} activeN3={activeN3}
            onFilter={handleFilter}
          />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

        {/* Delete confirm */}
        {confirmId && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} role="dialog" aria-modal="true">
            <div style={{ background:'var(--surface)', borderRadius:16, padding:28, maxWidth:300, width:'90%', textAlign:'center', boxShadow:'var(--shadow-lg)' }}>
              <IconAdvertencia size={34} weight="duotone" color="#ef4444" style={{ marginBottom:8 }} aria-hidden="true" />
              <h3 style={{ margin:'0 0 6px', fontSize:15 }}>¿Eliminar este gasto?</h3>
              <p style={{ color:'var(--text-muted)', fontSize:12, marginBottom:18 }}>Esta acción no se puede deshacer.</p>
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <button onClick={() => setConfirmId(null)} style={{ padding:'7px 16px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
                <button onClick={() => { onDelete(confirmId); setConfirmId(null) }} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* KPIs compactos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { label:'Total período', value: fmtMoney ? fmtMoney(total) : fmt(total), color:'#3b82f6', Icon:IconDinero },
            { label:'Registros',     value: filtered.length,                          color:'#10b981', Icon:IconRecibo },
            { label:'Promedio',      value: fmtMoney ? fmtMoney(avg)  : fmt(avg),     color:'#f59e0b', Icon:IconCalendario },
            { label:'Mayor gasto',   value: maxG ? (fmtMoney ? fmtMoney(maxG.monto) : fmt(maxG.monto)) : '—',
              sub:   maxG?.n4 || '',
              color:'#8b5cf6', Icon:IconTop },
          ].map(({ label, value, sub, color, Icon:Ic }, i) => (
            <div key={i} style={{ ...S.card, padding:'9px 12px', borderTop:`3px solid ${color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                <Ic size={12} weight="duotone" color={color} aria-hidden="true" />
                <span style={{ fontSize:9, color:'var(--text-muted)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:800, color, lineHeight:1.1 }}>{value}</div>
              {sub && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={sub}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Filtros período + búsqueda */}
        <div style={S.card}>
          <div style={{ marginBottom:8 }}>
            <div style={{ ...S.st, display:'flex', alignItems:'center', gap:4 }}>
              <IconCalendario size={10} aria-hidden="true" /> Período
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {PERIODOS.map(p => (
                <button key={p.id} onClick={() => handlePeriodo(p.id)}
                  style={{ ...S.chip, ...(periodo === p.id ? S.chipA : {}) }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {periodo === 'custom' && (
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={S.inp} aria-label="Desde" />
              <span style={{ color:'var(--text-muted)', fontSize:12 }}>al</span>
              <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={S.inp} aria-label="Hasta" />
            </div>
          )}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ position:'relative', flex:1 }}>
              <IconBuscar size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} aria-hidden="true" />
              <input placeholder="Buscar categoría, ítem o nota…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...S.inp, width:'100%', paddingLeft:28, boxSizing:'border-box' }} />
            </div>
            {hayFiltros && (
              <button onClick={() => { handleFilter({ n1:'', n2:'', n3:'' }); setSearch(''); handlePeriodo('mes') }}
                style={{ padding:'6px 11px', borderRadius:8, border:'1.5px solid #ef4444', background:'transparent', color:'#ef4444', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                <IconCerrar size={10} aria-hidden="true" /> Limpiar
              </button>
            )}
          </div>
          {(activeN1 || activeN2 || activeN3) && (
            <div style={{ marginTop:7, display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>Viendo:</span>
              {[activeN1, activeN2, activeN3].filter(Boolean).map((seg, i) => (
                <span key={i} style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:99,
                  background:(N1_COLORS[activeN1]||{}).light||'var(--accent-light)',
                  color:(N1_COLORS[activeN1]||{}).bg||'var(--accent)' }}>
                  {seg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabla */}
        <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={S.st}>{filtered.length} registros</div>
            <span style={{ fontSize:10, color:'var(--text-muted)', fontStyle:'italic' }}>⠿ Arrastrá columnas para reordenar</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {cols.map(col => (
                    <ColHeader key={col.id} col={col}
                      sortField={sortField} sortDir={sortDir} onSort={handleSort}
                      dragOver={dragOver === col.id && dragFrom !== col.id}
                      onDragStart={setDragFrom}
                      onDragOver={setDragOver}
                      onDrop={handleDrop}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => {
                  const c = N1_COLORS[g.n1] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
                  return (
                    <tr key={g.id} style={{ borderBottom:'1px solid var(--border)', background: i%2===0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      {cols.map(col => {
                        switch(col.id) {
                          case 'monto':    return <td key="monto"    style={{ padding:'8px 12px', fontWeight:800, color:c.text, whiteSpace:'nowrap' }}>{fmt(g.monto)}</td>
                          case 'n4':       return <td key="n4"       style={{ padding:'8px 12px', fontWeight:700, color:'var(--text-primary)' }}>{g.n4}</td>
                          case 'cantidad': return <td key="cantidad"  style={{ padding:'8px 12px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{g.cantidad} {g.unidad}</td>
                          case 'n1':       return <td key="n1"        style={{ padding:'8px 12px' }}><span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, background:c.light, color:c.text, whiteSpace:'nowrap' }}>{g.n1}</span></td>
                          case 'n2':       return <td key="n2"        style={{ padding:'8px 12px', color:'var(--text-secondary)', fontSize:12, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.n2||'—'}</td>
                          case 'n3':       return <td key="n3"        style={{ padding:'8px 12px', color:'var(--text-secondary)', fontSize:12, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.n3||'—'}</td>
                          case 'fecha':    return <td key="fecha"     style={{ padding:'8px 12px', whiteSpace:'nowrap', color:'var(--text-muted)', fontSize:12 }}>{fmtDate(g.fecha)}</td>
                          case 'nota':     return <td key="nota"      style={{ padding:'8px 12px', color:'var(--text-muted)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, fontStyle:g.observaciones?'normal':'italic' }}>{g.observaciones||'—'}</td>
                          case 'acciones': return (
                            <td key="acciones" style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                              <button onClick={() => onEdit(g)} aria-label={`Editar ${g.n4}`}
                                style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:'3px', borderRadius:5, marginRight:2, display:'inline-flex' }}>
                                <IconEditar size={14} aria-hidden="true" />
                              </button>
                              <button onClick={() => setConfirmId(g.id)} aria-label={`Eliminar ${g.n4}`}
                                style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:'3px', borderRadius:5, display:'inline-flex' }}>
                                <IconEliminar size={14} aria-hidden="true" />
                              </button>
                            </td>
                          )
                          default: return null
                        }
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <div style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-muted)' }}>
                <IconBuscar size={28} weight="duotone" style={{ marginBottom:6 }} aria-hidden="true" />
                <p style={{ fontWeight:600, margin:0 }}>Sin resultados</p>
                <p style={{ fontSize:12, marginTop:4 }}>Probá cambiando el período o los filtros</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
