'use client'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { N1_COLORS, fmt, fmtDate, uniq, PERIODOS, getPeriodo } from '../lib/constants'
import { useApp } from '../context/AppContext'
import { useCategories } from '../lib/useCategories'
import {
  IconEditar, IconEliminar, IconBuscar, IconCerrar,
  IconDinero, IconRecibo, IconCalendario, IconTop,
  IconOrdenar, IconArriba, IconAbajo, IconFiltros,
  IconAdvertencia, IconCaretDown, IconCaretRight,
  IconRecurrentes, IconVer, IconOcultar, IconCheck,
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
const LS_KEY       = 'listview_col_order'
const LS_SIDEBAR   = 'listview_sidebar_open'
const LS_HIDDEN    = 'listview_hidden_cols'

function loadHidden(settings) {
  if (settings?.hidden_cols) return new Set(settings.hidden_cols)
  try { const s = localStorage.getItem(LS_HIDDEN); if (s) return new Set(JSON.parse(s)) } catch {}
  return new Set()
}

function loadOrder(settings) {
  if (settings?.col_order?.length) return settings.col_order
  try { const s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s) } catch {}
  return DEFAULT_ORDER
}

function loadSidebar() {
  try { const s = localStorage.getItem(LS_SIDEBAR); return s === null ? true : s === 'true' } catch {}
  return true
}

// ── Hook: cargar recurrentes una sola vez ────────────────────────────────────
function useRecurrentes() {
  const [list, setList]   = useState([])
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetch('/api/recurrentes')
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])
  return list
}

// ── Mini editor de recurrencia (modal rápido desde listado) ──────────────────
function RecurrenteQuickEditor({ gasto, recurrentes, onClose, onSaved }) {
  const existing = recurrentes.find(r => r.n4 === gasto.n4 && r.n1 === gasto.n1)
  const [form, setForm] = useState(existing
    ? { frecuencia: existing.frecuencia, intervalo_dias: existing.intervalo_dias || 30, activo: existing.activo }
    : { frecuencia: 'mensual', intervalo_dias: 30, activo: true }
  )
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const body = {
      n1: gasto.n1, n2: gasto.n2 || '', n3: gasto.n3 || '', n4: gasto.n4,
      monto: gasto.monto, unidad: gasto.unidad || 'unidad',
      frecuencia: form.frecuencia, intervalo_dias: form.intervalo_dias,
      activo: form.activo,
      fecha_inicio: new Date().toISOString().split('T')[0],
    }
    if (existing) {
      await fetch('/api/recurrentes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: existing.id, ...body }) })
    } else {
      await fetch('/api/recurrentes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setSaved(true)
    setTimeout(() => { onSaved(); onClose() }, 900)
  }

  const handleRemove = async () => {
    if (!existing) return
    setSaving(true)
    await fetch(`/api/recurrentes?id=${existing.id}`, { method: 'DELETE' })
    setSaving(false)
    onSaved(); onClose()
  }

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const FREQS = [
    { val:'diaria',    label:'Diaria'    },
    { val:'semanal',   label:'Semanal'   },
    { val:'quincenal', label:'Quincenal' },
    { val:'mensual',   label:'Mensual'   },
    { val:'custom',    label:'Personalizada' },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, backdropFilter:'blur(2px)' }} aria-hidden="true" />
      <div role="dialog" aria-modal="true"
        style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:1101, width:'min(400px,95vw)', background:'var(--surface)', borderRadius:16, boxShadow:'0 24px 60px rgba(0,0,0,.25)', overflow:'hidden' }}>
        
        <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:existing?'#f59e0b':'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <IconRecurrentes size={16} color="#fff" aria-hidden="true" />
          </div>
          <div style={{ flex:1 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
              {existing ? 'Editar recurrencia' : 'Activar recurrencia'}
            </h3>
            <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{gasto.n4}</p>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
            <IconCerrar size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={LBL}>Frecuencia</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {FREQS.map(f => (
                <button key={f.val} onClick={() => set('frecuencia', f.val)}
                  style={{ padding:'7px 13px', borderRadius:99, border:`1.5px solid ${form.frecuencia===f.val?'var(--accent)':'var(--border)'}`, background:form.frecuencia===f.val?'var(--accent)':'var(--surface2)', color:form.frecuencia===f.val?'#fff':'var(--text-secondary)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {form.frecuencia === 'custom' && (
            <div>
              <label style={LBL}>Cada cuántos días</label>
              <input type="number" min="1" value={form.intervalo_dias} onChange={e => set('intervalo_dias', parseInt(e.target.value)||1)}
                style={{ padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--surface)', color:'var(--text-primary)', outline:'none', width:'100px' }} />
            </div>
          )}

          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
            <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)}
              style={{ accentColor:'var(--accent)', width:15, height:15 }} />
            <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>Activo</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>(se generará automáticamente)</span>
          </label>

          {saved && (
            <div style={{ padding:'8px 12px', background:'#d1fae5', borderRadius:8, fontSize:13, color:'#059669', fontWeight:700 }}>
              ✓ Guardado correctamente
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8, padding:'12px 20px', borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
          {existing && (
            <button onClick={handleRemove} disabled={saving}
              style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#fee2e2', color:'#ef4444', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              Quitar recurrencia
            </button>
          )}
          <div style={{ flex:1 }} />
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || saved}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            {saving ? '…' : (existing ? 'Guardar' : 'Activar')}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

const LBL = { display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }

// ── DrillDown sidebar ─────────────────────────────────────────────────────────
function DrillDown({ gastos, activeN1, activeN2, activeN3, onFilter }) {
  const [openN1, setOpenN1] = useState(activeN1 || null)
  const [openN2, setOpenN2] = useState(activeN2 ? `${activeN1}/${activeN2}` : null)

  const totalAll = gastos.reduce((s, g) => s + (g.monto || 0), 0)
  const byN1 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { if (g.n1) m[g.n1] = (m[g.n1] || 0) + (g.monto || 0) })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [gastos])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      {/* Todos */}
      <div onClick={() => { onFilter({ n1:'', n2:'', n3:'' }); setOpenN1(null); setOpenN2(null) }}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 7px', borderRadius:7, cursor:'pointer',
          background: !activeN1 ? 'var(--accent-light)' : 'transparent',
          border: `1.5px solid ${!activeN1 ? 'var(--accent)' : 'transparent'}`,
          fontSize:12, fontWeight: !activeN1 ? 700 : 500,
          color: !activeN1 ? 'var(--accent)' : 'var(--text-secondary)', userSelect:'none' }}>
        <span style={{ fontSize:10 }}>⊞</span> Todos
      </div>

      {byN1.map(([n1, v]) => {
        const c   = N1_COLORS[n1] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
        const pct = totalAll ? Math.round(v / totalAll * 100) : 0
        const isOpen   = openN1 === n1
        const isActive = activeN1 === n1 && !activeN2

        const byN2 = {}
        gastos.filter(g => g.n1 === n1).forEach(g => { if (g.n2) byN2[g.n2] = (byN2[g.n2] || 0) + (g.monto || 0) })
        const n2entries = Object.entries(byN2).sort((a, b) => b[1] - a[1])

        return (
          <div key={n1}>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 7px', borderRadius:7, cursor:'pointer',
              background: isActive ? c.light : 'transparent',
              border:`1.5px solid ${isActive ? c.bg : 'transparent'}`, transition:'all .1s', userSelect:'none' }}>
              <span onClick={() => setOpenN1(isOpen ? null : n1)}
                style={{ color:'var(--text-muted)', fontSize:9, padding:'0 2px', flexShrink:0 }}>
                {isOpen ? <IconCaretDown size={9} aria-hidden="true" /> : <IconCaretRight size={9} aria-hidden="true" />}
              </span>
              <span style={{ width:6, height:6, borderRadius:'50%', background:c.bg, flexShrink:0 }} />
              <span onClick={() => { onFilter({ n1, n2:'', n3:'' }); setOpenN1(n1) }}
                style={{ flex:1, fontSize:12, fontWeight:700, color: isActive ? c.bg : 'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {n1}
              </span>
              <span style={{ fontSize:10, fontWeight:800, color:c.bg, flexShrink:0 }}>{pct}%</span>
            </div>

            {isOpen && n2entries.map(([n2, v2]) => {
              const isActiveN2 = activeN1 === n1 && activeN2 === n2 && !activeN3
              const pct2 = v ? Math.round(v2 / v * 100) : 0
              const byN3 = {}
              gastos.filter(g => g.n1 === n1 && g.n2 === n2).forEach(g => { if (g.n3) byN3[g.n3] = (byN3[g.n3] || 0) + (g.monto || 0) })
              const n3entries  = Object.entries(byN3).sort((a, b) => b[1] - a[1])
              const key2       = `${n1}/${n2}`
              const isOpenN2   = openN2 === key2

              return (
                <div key={n2}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 7px 4px 18px', borderRadius:6, cursor:'pointer',
                    background: isActiveN2 ? c.light : 'transparent',
                    border:`1.5px solid ${isActiveN2 ? c.bg+'60' : 'transparent'}`, userSelect:'none' }}>
                    {n3entries.length > 0 && (
                      <span onClick={() => setOpenN2(isOpenN2 ? null : key2)}
                        style={{ color:'var(--text-muted)', fontSize:9, flexShrink:0 }}>
                        {isOpenN2 ? <IconCaretDown size={9} aria-hidden="true" /> : <IconCaretRight size={9} aria-hidden="true" />}
                      </span>
                    )}
                    <span onClick={() => onFilter({ n1, n2, n3:'' })}
                      style={{ flex:1, fontSize:11, color: isActiveN2 ? c.bg : 'var(--text-secondary)', fontWeight: isActiveN2 ? 700 : 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {n2}
                    </span>
                    <span style={{ fontSize:9, color:'var(--text-muted)', flexShrink:0 }}>{pct2}%</span>
                  </div>
                  {isOpenN2 && n3entries.map(([n3, v3]) => {
                    const isActiveN3 = activeN1 === n1 && activeN2 === n2 && activeN3 === n3
                    const pct3 = v2 ? Math.round(v3 / v2 * 100) : 0
                    return (
                      <div key={n3} onClick={() => onFilter({ n1, n2, n3 })}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 7px 3px 30px', borderRadius:6, cursor:'pointer',
                          background: isActiveN3 ? c.light : 'transparent',
                          border:`1.5px solid ${isActiveN3 ? c.bg+'30' : 'transparent'}`, userSelect:'none' }}>
                        <span style={{ flex:1, fontSize:11, color: isActiveN3 ? c.bg : 'var(--text-muted)', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n3}</span>
                        <span style={{ fontSize:9, color:'var(--text-muted)', flexShrink:0 }}>{pct3}%</span>
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

// ── Column header (draggable) ─────────────────────────────────────────────────
function ColHeader({ col, sortField, sortDir, onSort, isDragOver, onDragStart, onDragOver, onDrop }) {
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
        color: isDragOver ? 'var(--accent)' : 'var(--text-muted)',
        fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em',
        whiteSpace:'nowrap', borderBottom:'2px solid var(--border)',
        cursor: col.sortable ? 'pointer' : (col.id !== 'acciones' ? 'grab' : 'default'),
        userSelect:'none', background: isDragOver ? 'var(--accent-light)' : 'var(--surface2)',
        borderRight: isDragOver ? '2px solid var(--accent)' : undefined, transition:'background .1s',
      }}>
      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
        {col.id !== 'acciones' && <span style={{ opacity:0.2, fontSize:9 }}>⠿</span>}
        {col.label}
        {col.sortable && (
          sortField === col.field
            ? (sortDir === 'asc' ? <IconArriba size={9} weight="bold" /> : <IconAbajo size={9} weight="bold" />)
            : <IconOrdenar size={9} color="var(--text-muted)" />
        )}
      </span>
    </th>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── Panel de gastos pendientes de revisión ────────────────────────────────────
function PendientesPanel({ gastos, onDelete, onConfirm }) {
  const pendientes = gastos.filter(g => g.pendiente_revision)
  const { categories } = useCategories()
  const UNIT_OPTS = ['unidad','kg','gr','litro','ml','paquete','caja','docena','metro','garrafa','bolsa','porcion','rollo']
  const [editId,     setEditId]     = useState(null)
  const [editData,   setEditData]   = useState({})
  const [agregarCat, setAgregarCat] = useState(false)
  const [saving,     setSaving]     = useState(false)

  const n1Opts = useMemo(() => {
    const seen = new Set()
    return categories.filter(r => r.n1 && !seen.has(r.n1) && seen.add(r.n1)).map(r => r.n1).sort()
  }, [categories])

  const n2Opts = useMemo(() => {
    if (!editData.n1) return []
    const seen = new Set()
    return categories.filter(r => r.n1 === editData.n1 && r.n2 && !seen.has(r.n2) && seen.add(r.n2)).map(r => r.n2).sort()
  }, [categories, editData.n1])

  const n3Opts = useMemo(() => {
    if (!editData.n1 || !editData.n2) return []
    const seen = new Set()
    return categories.filter(r => r.n1 === editData.n1 && r.n2 === editData.n2 && r.n3 && !seen.has(r.n3) && seen.add(r.n3)).map(r => r.n3).sort()
  }, [categories, editData.n1, editData.n2])

  if (!pendientes.length) return null

  const startEdit = (g) => {
    setEditId(g.id)
    setEditData({ n4: g.n4||'', n1: g.n1||'', n2: g.n2||'', n3: g.n3||'', monto: g.monto||0, cantidad: g.cantidad||1, unidad: g.unidad||'unidad' })
    setAgregarCat(false)
  }

  const handleConfirm = async (g) => {
    const data = editId === g.id ? editData : { n4: g.n4, n1: g.n1, n2: g.n2, n3: g.n3, monto: g.monto, cantidad: g.cantidad, unidad: g.unidad }
    if (!data.n4.trim()) return
    setSaving(true)
    try {
      await fetch('/api/gastos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: g.id, ...data, pendiente_revision: false }),
      })
      if (agregarCat && data.n4.trim() && data.n1) {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: data.n4.trim(), n1: data.n1, n2: data.n2||null, n3: data.n3||null, unidad_default: data.unidad||'unidad' }),
        })
      }
      onConfirm?.()
      setEditId(null)
    } finally { setSaving(false) }
  }

  const inp = { padding:'7px 10px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:12, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }
  const sel = { ...inp, cursor:'pointer', appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center', paddingRight:24 }
  const lbl = { fontSize:10, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:3, textTransform:'uppercase', letterSpacing:'.04em' }

  return (
    <div style={{ background:'#fff7ed', border:'2px solid #fed7aa', borderRadius:14, overflow:'hidden', marginBottom:4 }}>
      <div style={{ padding:'10px 16px', background:'#ffedd5', borderBottom:'1px solid #fed7aa', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:18 }}>🔍</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#c2410c' }}>
            {pendientes.length} gasto{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''} de revision
          </div>
          <div style={{ fontSize:11, color:'#ea580c' }}>Registrados por voz - item no reconocido en el catalogo</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {pendientes.map((g, i) => (
          <div key={g.id} style={{ borderBottom: i < pendientes.length-1 ? '1px solid #fed7aa' : 'none' }}>
            {editId === g.id ? (
              <div style={{ padding:'16px', background:'#fffbf5', display:'flex', flexDirection:'column', gap:12 }}>
                {g.transcripcion_voz && (
                  <div style={{ fontSize:11, padding:'6px 10px', background:'#fff7ed', borderRadius:7, color:'#92400e', borderLeft:'3px solid #fb923c' }}>
                    Escuche: <strong>"{g.transcripcion_voz}"</strong>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={lbl}>Nombre del item *</label>
                    <input value={editData.n4} onChange={e => setEditData(p=>({...p, n4:e.target.value}))} style={inp} placeholder="Nombre corregido..."/>
                  </div>
                  <div>
                    <label style={lbl}>Monto *</label>
                    <input type="number" value={editData.monto} onChange={e => setEditData(p=>({...p, monto:parseFloat(e.target.value)||0}))} style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Cantidad</label>
                    <input type="number" min="0.01" step="0.01" value={editData.cantidad} onChange={e => setEditData(p=>({...p, cantidad:parseFloat(e.target.value)||1}))} style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Tipo N1 *</label>
                    <select value={editData.n1} onChange={e => setEditData(p=>({...p, n1:e.target.value, n2:'', n3:''}))} style={sel}>
                      <option value="">Sin definir</option>
                      {n1Opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Area N2</label>
                    <select value={editData.n2} onChange={e => setEditData(p=>({...p, n2:e.target.value, n3:''}))} style={sel} disabled={!editData.n1}>
                      <option value="">Sin area</option>
                      {n2Opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Subcategoria N3</label>
                    <select value={editData.n3} onChange={e => setEditData(p=>({...p, n3:e.target.value}))} style={sel} disabled={!editData.n2}>
                      <option value="">Sin subcategoria</option>
                      {n3Opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ borderTop:'1px dashed #fed7aa', paddingTop:12 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
                    <div onClick={() => setAgregarCat(p => !p)}
                      style={{ width:18, height:18, borderRadius:5, border:`2px solid ${agregarCat ? '#22c55e' : 'var(--border)'}`, background: agregarCat ? '#22c55e' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .12s' }}>
                      {agregarCat && <span style={{ color:'#fff', fontSize:11, fontWeight:900, lineHeight:1 }}>v</span>}
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
                      Agregar este item al catalogo para futuros registros por voz
                    </span>
                  </label>

                  {agregarCat && (
                    <div style={{ marginTop:10, padding:'12px', background:'#f0fdf4', borderRadius:9, border:'1px solid #bbf7d0', display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#15803d' }}>Datos para el catalogo</div>
                      <div>
                        <label style={{ ...lbl, color:'#15803d' }}>Unidad por defecto</label>
                        <select value={editData.unidad} onChange={e => setEditData(p=>({...p, unidad:e.target.value}))} style={{ ...sel, borderColor:'#86efac' }}>
                          {UNIT_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div style={{ fontSize:11, color:'#16a34a', lineHeight:1.6, padding:'6px 10px', background:'#dcfce7', borderRadius:6 }}>
                        Guardando: <strong>{editData.n4||'(sin nombre)'}</strong>
                        {editData.n1 && <span> en <strong>{editData.n1}{editData.n2 ? ' > '+editData.n2 : ''}{editData.n3 ? ' > '+editData.n3 : ''}</strong></span>}
                        <span> - unidad: <strong>{editData.unidad||'unidad'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
                  <button onClick={() => setEditId(null)} style={{ padding:'7px 16px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface2)', color:'var(--text-muted)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
                  <button onClick={() => onDelete(g.id)} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'#fee2e2', color:'#ef4444', fontSize:12, fontWeight:700, cursor:'pointer' }}>Eliminar</button>
                  <button onClick={() => handleConfirm(g)} disabled={saving || !editData.n4.trim() || !editData.n1}
                    style={{ padding:'7px 20px', borderRadius:8, border:'none', background:(editData.n4.trim()&&editData.n1)?'#22c55e':'var(--border)', color:(editData.n4.trim()&&editData.n1)?'#fff':'var(--text-muted)', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                    {saving ? 'Guardando...' : agregarCat ? 'Confirmar y agregar al catalogo' : 'Confirmar gasto'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding:'11px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#c2410c' }}>{g.n4}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
                    {g.transcripcion_voz ? g.transcripcion_voz + ' - ' : ''}{fmtDate(g.fecha)} - {fmt(g.monto)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  <button onClick={() => startEdit(g)} style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid #fed7aa', background:'#fff7ed', color:'#c2410c', fontSize:11, fontWeight:700, cursor:'pointer' }}>Editar</button>
                  <button onClick={() => handleConfirm(g)} disabled={saving} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#22c55e', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>OK</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


export default function ListView({ gastos, onDelete, onEdit, onRefresh }) {
  const { fmtMoney, saveSettings, settings } = useApp()
  const recurrentes = useRecurrentes()

  // Sidebar toggle (persiste en sessionStorage)
  const [sidebarOpen, setSidebarOpen] = useState(() => loadSidebar())
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem(LS_SIDEBAR, String(next)) } catch {}
  }

  // Col order
  const [colOrder, setColOrder] = useState(() => loadOrder(settings))
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [hiddenCols, setHiddenCols] = useState(() => loadHidden(settings))
  const [showColPanel, setShowColPanel] = useState(false)

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
  const [fFrom,    setFFrom]      = useState(() => getPeriodo('mes').from)
  const [fTo,      setFTo]        = useState(() => getPeriodo('mes').to)
  const [search,   setSearch]     = useState('')
  const [periodo,  setPeriodo]    = useState('mes')
  const [sortField,setSortField]  = useState('fecha')
  const [sortDir,  setSortDir]    = useState('desc')
  const [confirmId,setConfirmId]  = useState(null)

  // Recurrencia quick-edit
  const [editRecGasto, setEditRecGasto] = useState(null)
  const [recKey,       setRecKey]       = useState(0) // fuerza re-fetch al guardar

  const handlePeriodo = (id) => {
    setPeriodo(id)
    if (id !== 'custom') { const { from, to } = getPeriodo(id); setFFrom(from); setFTo(to) }
  }
  const handleFilter = ({ n1, n2, n3 }) => { setActiveN1(n1); setActiveN2(n2); setActiveN3(n3) }
  const handleSort = (field) => {
    if (!field) return
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const toggleColVisible = (id) => {
    if (id === 'acciones') return // acciones siempre visible
    const next = new Set(hiddenCols)
    next.has(id) ? next.delete(id) : next.add(id)
    setHiddenCols(next)
    try { localStorage.setItem(LS_HIDDEN, JSON.stringify([...next])) } catch {}
    saveSettings?.({ hidden_cols: [...next] })
  }

  const cols = useMemo(() =>
    colOrder.map(id => ALL_COLS.find(c => c.id === id)).filter(Boolean).filter(c => !hiddenCols.has(c.id)),
    [colOrder, hiddenCols])

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

  // Lookup recurrentes por n4+n1
  const recSet = useMemo(() => {
    const m = {}
    recurrentes.forEach(r => { m[`${r.n1}|${r.n4}`] = r })
    return m
  }, [recurrentes, recKey])

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
    <div style={{ display:'flex', gap: sidebarOpen ? 14 : 0, position:'relative' }}>

      {/* SIDEBAR con animación suave */}
      <div style={{
        width: sidebarOpen ? 186 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width .2s ease',
      }}>
        <div style={{ width:186 }}>
          <div style={{ ...S.card, padding:'10px 9px', position:'sticky', top:0 }}>
            <div style={{ ...S.st, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                <IconFiltros size={10} aria-hidden="true" /> Filtrar
              </span>
              {activeN1 && (
                <button onClick={() => handleFilter({ n1:'', n2:'', n3:'' })}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', fontSize:9, fontWeight:700, padding:0 }}>
                  ✕ limpiar
                </button>
              )}
            </div>
            <DrillDown gastos={gastos} activeN1={activeN1} activeN2={activeN2} activeN3={activeN3} onFilter={handleFilter} />
          </div>
        </div>
      </div>

      {/* MAIN content */}
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

        {/* Recurrencia quick-edit modal */}
        {editRecGasto && (
          <RecurrenteQuickEditor
            gasto={editRecGasto}
            recurrentes={recurrentes}
            onClose={() => setEditRecGasto(null)}
            onSaved={() => setRecKey(k => k + 1)}
          />
        )}

        {/* Pendientes de revisión */}
        <PendientesPanel gastos={gastos} onEdit={onEdit} onDelete={(id) => { onDelete(id) }} onConfirm={onRefresh} />

        {/* KPIs compactos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { label:'Total período', value: fmtMoney ? fmtMoney(total) : fmt(total), color:'#3b82f6', Icon:IconDinero },
            { label:'Registros',     value: filtered.length,                          color:'#10b981', Icon:IconRecibo },
            { label:'Promedio',      value: fmtMoney ? fmtMoney(avg)  : fmt(avg),     color:'#f59e0b', Icon:IconCalendario },
            { label:'Mayor gasto',   value: maxG ? (fmtMoney ? fmtMoney(maxG.monto) : fmt(maxG.monto)) : '—', sub: maxG?.n4||'', color:'#8b5cf6', Icon:IconTop },
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

        {/* Filtros período + toggle sidebar */}
        <div style={S.card}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
            {/* Toggle sidebar */}
            <button onClick={toggleSidebar}
              title={sidebarOpen ? 'Ocultar panel de filtros' : 'Mostrar panel de filtros'}
              aria-pressed={sidebarOpen}
              style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${sidebarOpen ? 'var(--accent)' : 'var(--border)'}`, background:sidebarOpen?'var(--accent-light)':'var(--surface)', color:sidebarOpen?'var(--accent)':'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:sidebarOpen?700:500, flexShrink:0, transition:'all .15s' }}>
              {sidebarOpen
                ? <><IconOcultar size={13} aria-hidden="true" /> Ocultar filtros</>
                : <><IconVer size={13} aria-hidden="true" /> Mostrar filtros</>}
            </button>
            <div style={{ ...S.st, margin:0, display:'flex', alignItems:'center', gap:4 }}>
              <IconCalendario size={10} aria-hidden="true" /> Período
            </div>
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
            {PERIODOS.map(p => (
              <button key={p.id} onClick={() => handlePeriodo(p.id)}
                style={{ ...S.chip, ...(periodo === p.id ? S.chipA : {}) }}>
                {p.label}
              </button>
            ))}
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
          <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={S.st}>{filtered.length} registros
              {recurrentes.length > 0 && (
                <span style={{ marginLeft:8, fontSize:9, fontWeight:500, color:'var(--text-muted)', fontStyle:'italic' }}>
                  · <span style={{ color:'#f59e0b' }}>🔄</span> = recurrente
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', position:'relative' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontStyle:'italic' }}>⠿ Arrastrá para reordenar</span>
              {/* Botón ocultar/mostrar columnas */}
              <button onClick={() => setShowColPanel(p => !p)}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', border:'1.5px solid var(--border)', borderRadius:6, background: showColPanel ? 'var(--accent)' : 'var(--surface)', color: showColPanel ? '#fff' : 'var(--text-muted)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                <IconOcultar size={12} aria-hidden="true" />
                Columnas {hiddenCols.size > 0 && <span style={{ background: showColPanel ? 'rgba(255,255,255,.3)' : 'var(--accent)', color: showColPanel ? '#fff' : '#fff', borderRadius:99, padding:'0px 5px', fontSize:9, fontWeight:800 }}>{hiddenCols.size} oculta{hiddenCols.size !== 1 ? 's' : ''}</span>}
              </button>
              {/* Panel de columnas */}
              {showColPanel && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:300, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.12)', padding:'10px 12px', minWidth:180 }}>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-muted)', marginBottom:8 }}>Mostrar columnas</div>
                  {ALL_COLS.filter(c => c.id !== 'acciones').map(col => {
                    const visible = !hiddenCols.has(col.id)
                    return (
                      <label key={col.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 4px', cursor:'pointer', borderRadius:5, userSelect:'none' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <div onClick={() => toggleColVisible(col.id)}
                          style={{ width:16, height:16, borderRadius:4, border:`2px solid ${visible ? 'var(--accent)' : 'var(--border)'}`, background: visible ? 'var(--accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer', transition:'all .12s' }}>
                          {visible && <IconCheck size={10} color="#fff" aria-hidden="true" />}
                        </div>
                        <span style={{ fontSize:12, color: visible ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: visible ? 600 : 400 }}>{col.label}</span>
                      </label>
                    )
                  })}
                  <div style={{ marginTop:8, borderTop:'1px solid var(--border)', paddingTop:7, display:'flex', gap:5 }}>
                    <button onClick={() => { setHiddenCols(new Set()); try{localStorage.removeItem(LS_HIDDEN)}catch{} }}
                      style={{ flex:1, padding:'4px', border:'none', borderRadius:5, background:'var(--surface2)', color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                      Mostrar todo
                    </button>
                    <button onClick={() => setShowColPanel(false)}
                      style={{ flex:1, padding:'4px', border:'none', borderRadius:5, background:'var(--accent)', color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {cols.map(col => (
                    <ColHeader key={col.id} col={col}
                      sortField={sortField} sortDir={sortDir} onSort={handleSort}
                      isDragOver={dragOver === col.id && dragFrom !== col.id}
                      onDragStart={setDragFrom} onDragOver={setDragOver} onDrop={handleDrop}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => {
                  const c = N1_COLORS[g.n1] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
                  const rec = recSet[`${g.n1}|${g.n4}`]
                  return (
                    <tr key={g.id} style={{ borderBottom:'1px solid var(--border)', background: g.pendiente_revision ? '#fff7ed' : (i%2===0 ? 'var(--surface)' : 'var(--surface2)') }}>
                      {cols.map(col => {
                        switch(col.id) {
                          case 'monto': return (
                            <td key="monto" style={{ padding:'8px 12px', fontWeight:800, color:c.text, whiteSpace:'nowrap' }}>{fmt(g.monto)}</td>
                          )
                          case 'n4': return (
                            <td key="n4" style={{ padding:'8px 12px', fontWeight:700, color:'var(--text-primary)' }}>
                              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                                {g.n4}
                                {rec && (
                                  <button
                                    onClick={() => setEditRecGasto(g)}
                                    title={`Recurrente · ${rec.frecuencia}${rec.frecuencia==='custom'?` cada ${rec.intervalo_dias}d`:''} · Clic para editar`}
                                    style={{ border:'none', background:'none', cursor:'pointer', padding:'1px 3px', borderRadius:4, display:'inline-flex', alignItems:'center', color:'#f59e0b', flexShrink:0 }}>
                                    <IconRecurrentes size={12} weight="bold" aria-label={`Recurrente ${rec.frecuencia}`} />
                                  </button>
                                )}
                              </span>
                            </td>
                          )
                          case 'cantidad': return <td key="cantidad" style={{ padding:'8px 12px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{g.cantidad} {g.unidad}</td>
                          case 'n1':       return <td key="n1" style={{ padding:'8px 12px' }}><span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, background:c.light, color:c.text, whiteSpace:'nowrap' }}>{g.n1}</span></td>
                          case 'n2':       return <td key="n2" style={{ padding:'8px 12px', color:'var(--text-secondary)', fontSize:12, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.n2||'—'}</td>
                          case 'n3':       return <td key="n3" style={{ padding:'8px 12px', color:'var(--text-secondary)', fontSize:12, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.n3||'—'}</td>
                          case 'fecha':    return <td key="fecha" style={{ padding:'8px 12px', whiteSpace:'nowrap', color:'var(--text-muted)', fontSize:12 }}>{fmtDate(g.fecha)}</td>
                          case 'nota':     return <td key="nota" style={{ padding:'8px 12px', color:'var(--text-muted)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, fontStyle:g.observaciones?'normal':'italic' }}>{g.observaciones||'—'}</td>
                          case 'acciones': return (
                            <td key="acciones" style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                              <button onClick={() => onEdit(g)} aria-label={`Editar ${g.n4}`}
                                style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:'3px', borderRadius:5, marginRight:2, display:'inline-flex' }}>
                                <IconEditar size={14} aria-hidden="true" />
                              </button>
                              <button onClick={() => setEditRecGasto(g)} aria-label={`Recurrencia ${g.n4}`}
                                title={rec ? `Editar recurrencia (${rec.frecuencia})` : 'Activar recurrencia'}
                                style={{ border:'none', background:'none', cursor:'pointer', color: rec ? '#f59e0b' : 'var(--text-muted)', padding:'3px', borderRadius:5, marginRight:2, display:'inline-flex' }}>
                                <IconRecurrentes size={14} aria-hidden="true" />
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
