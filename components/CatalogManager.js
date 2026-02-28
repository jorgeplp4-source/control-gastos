'use client'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { N1_COLORS } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import { useUnits } from '../lib/useUnits'
import {
  IconPlus, IconEditar, IconEliminar, IconCaretRight,
  IconSpinner, IconCerrar, IconCheck, IconBuscar, IconItems,
} from '../lib/icons'

const COL_LABELS = ['Tipo (N1)', 'Área (N2)', 'Subcategoría (N3)', 'Ítems']
const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱','🌿','🎓','🏥','💰','🔑','🍕','🎵','🏖️']

// ── Build tree from flat ──────────────────────────────────────────────────────
function buildTree(cats) {
  const n1M = new Map(), n2M = new Map(), n3M = new Map()
  cats.forEach(r => {
    if (r.n1_id && !n1M.has(r.n1_id))
      n1M.set(r.n1_id, { id: r.n1_id, nombre: r.n1, icono: r.icono || '📦', children: [] })
    if (r.n2_id && !n2M.has(r.n2_id)) {
      const node = { id: r.n2_id, nombre: r.n2, children: [] }
      n2M.set(r.n2_id, node)
      const p = n1M.get(r.n1_id)
      if (p && !p.children.find(c => c.id === r.n2_id)) p.children.push(node)
    }
    if (r.n3_id && !n3M.has(r.n3_id)) {
      const node = { id: r.n3_id, nombre: r.n3 }
      n3M.set(r.n3_id, node)
      const p = n2M.get(r.n2_id)
      if (p && !p.children.find(c => c.id === r.n3_id)) p.children.push(node)
    }
  })
  return {
    n1List: [...n1M.values()],
    n2Of:   id => n1M.get(id)?.children || [],
    n3Of:   id => n2M.get(id)?.children || [],
  }
}

// ── AddRow — footer con input inline (+ unidad opcional para ítems) ───────────
function AddRow({ placeholder, withIcon, withUnit, units, onAdd, disabled }) {
  const [open, setOpen] = useState(false)
  const [val,  setVal]  = useState('')
  const [ico,  setIco]  = useState('📦')
  const [unit, setUnit] = useState('unidad')
  const [busy, setBusy] = useState(false)
  const inp = useRef(null)

  const open_ = () => { if (!disabled) { setOpen(true); setTimeout(() => inp.current?.focus(), 40) } }
  const close = () => { setOpen(false); setVal(''); setUnit('unidad') }
  const submit = async () => {
    if (!val.trim() || busy) return
    setBusy(true); await onAdd(val.trim(), withIcon ? ico : unit); setBusy(false); close()
  }

  return (
    <div style={{ borderTop:'1px solid var(--border)', padding:'6px 8px', flexShrink:0, background:'var(--surface2)' }}>
      {!open ? (
        <button onClick={open_} disabled={disabled}
          style={{ width:'100%', padding:'5px 10px', border:'1.5px dashed var(--border)', borderRadius:8, background:'transparent', color:disabled?'var(--text-muted)':'var(--accent)', fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:5, opacity:disabled?.4:1 }}>
          <IconPlus size={11} aria-hidden="true" />Agregar…
        </button>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {withIcon && (
              <span onClick={() => setIco(ICONOS[(ICONOS.indexOf(ico)+1)%ICONOS.length])}
                style={{ fontSize:15, cursor:'pointer', flexShrink:0 }} title="Click para cambiar ícono">{ico}</span>
            )}
            <input ref={inp} value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') submit(); if(e.key==='Escape') close() }}
              placeholder={placeholder}
              style={{ flex:1, padding:'5px 8px', border:'1.5px solid var(--accent)', borderRadius:6, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12, outline:'none', minWidth:0 }} />
            <button onClick={submit} disabled={!val.trim()||busy}
              style={{ width:26, height:26, border:'none', borderRadius:6, background:val.trim()?'var(--accent)':'var(--border)', color:'#fff', cursor:val.trim()?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {busy ? <IconSpinner size={11} style={{ animation:'spin .8s linear infinite' }} /> : <IconCheck size={11} />}
            </button>
            <button onClick={close} style={{ width:26, height:26, border:'none', borderRadius:6, background:'var(--surface3,#f1f5f9)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <IconCerrar size={11} />
            </button>
          </div>
          {/* Selector de unidad para ítems */}
          {withUnit && units?.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, flexShrink:0 }}>Unidad:</span>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                style={{ flex:1, padding:'3px 6px', border:'1px solid var(--border)', borderRadius:5, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:11, outline:'none', cursor:'pointer' }}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MRow — fila de categoría o ítem ──────────────────────────────────────────
function MRow({ id, label, icon, unit, count, selected, color, onSelect, onEdit, onDelete, isItem, units }) {
  const [editing, setEditing] = useState(false)
  const [ev,      setEv]      = useState(label)
  const [eu,      setEu]      = useState(unit || '')
  const [ds,      setDs]      = useState(null)
  const [busy,    setBusy]    = useState(false)
  const inp = useRef(null)
  useEffect(() => { if(editing) setTimeout(()=>inp.current?.focus(),40) }, [editing])

  const saveEdit = async () => {
    if(!ev.trim()||ev===label||busy) return
    setBusy(true)
    const ok = await onEdit(id, ev.trim(), isItem ? eu : undefined)
    setBusy(false)
    if(ok) setEditing(false); else setEv(label)
  }
  const confirmDel = async () => {
    setBusy(true); const r = await onDelete(id,label); setBusy(false)
    if(r!==true) setDs('err:'+r); else setDs(null)
  }

  const c = color || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }

  if(typeof ds==='string' && ds.startsWith('err:')) return (
    <div style={{ margin:'2px 4px', padding:'7px 10px', background:'#fee2e2', borderRadius:8, fontSize:11 }}>
      <div style={{ color:'#dc2626', fontWeight:700, marginBottom:3 }}>⚠ {ds.slice(4)}</div>
      <button onClick={()=>setDs(null)} style={{ fontSize:11, padding:'2px 8px', border:'none', borderRadius:4, background:'#fecaca', color:'#b91c1c', cursor:'pointer' }}>OK</button>
    </div>
  )
  if(ds==='confirm') return (
    <div style={{ margin:'2px 4px', padding:'7px 10px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, fontSize:11 }}>
      <div style={{ fontWeight:700, color:'#c2410c', marginBottom:4 }}>¿Eliminar "{label}"?</div>
      <div style={{ display:'flex', gap:5 }}>
        <button onClick={confirmDel} disabled={busy}
          style={{ padding:'3px 10px', border:'none', borderRadius:5, background:'#ef4444', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer' }}>{busy?'…':'Sí, eliminar'}</button>
        <button onClick={()=>setDs(null)} style={{ padding:'3px 8px', border:'1px solid var(--border)', borderRadius:5, background:'transparent', color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div className="mrow" onClick={()=>!editing&&onSelect?.()} style={{
      display:'flex', alignItems:'center', gap:7, padding:'7px 10px',
      cursor: onSelect ? 'pointer' : 'default',
      borderRadius:8, margin:'1px 4px', position:'relative',
      background: selected ? (c.light||'var(--accent-light,#eff6ff)') : 'transparent',
      border: `1.5px solid ${selected?(c.bg||'var(--accent)'):'transparent'}`,
      transition:'background .1s',
    }}>
      {icon
        ? <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
        : <span style={{ width:7, height:7, borderRadius:'50%', background:c.bg, flexShrink:0 }} />}

      {editing ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4, minWidth:0 }} onClick={e=>e.stopPropagation()}>
          <div style={{ display:'flex', gap:4 }}>
            <input ref={inp} value={ev} onChange={e=>setEv(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape'){setEditing(false);setEv(label)} }}
              style={{ flex:1, padding:'3px 7px', border:'1.5px solid var(--accent)', borderRadius:5, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:13, outline:'none', minWidth:0 }} />
            <button onClick={saveEdit} disabled={busy}
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'var(--accent)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {busy ? <IconSpinner size={10} style={{ animation:'spin .8s linear infinite' }} /> : <IconCheck size={10} />}
            </button>
            <button onClick={()=>{setEditing(false);setEv(label)}}
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <IconCerrar size={10} />
            </button>
          </div>
          {/* Editar unidad en ítems */}
          {isItem && units?.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>Unidad:</span>
              <select value={eu} onChange={e=>setEu(e.target.value)}
                style={{ flex:1, padding:'2px 6px', border:'1px solid var(--border)', borderRadius:4, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:11, outline:'none' }}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
        </div>
      ) : (
        <>
          <span style={{ flex:1, fontSize:13, fontWeight:selected?700:500, color:selected?(c.text||c.bg):'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {label}
            {unit && <span style={{ marginLeft:5, fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>{unit}</span>}
          </span>
          {count>0 && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', flexShrink:0 }}>{count}</span>}
          {!isItem && onSelect && <IconCaretRight size={10} color="var(--text-muted)" style={{ flexShrink:0 }} aria-hidden="true" />}
          <div className="mrow-actions" style={{ display:'none', gap:2, position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:selected?(c.light||'var(--surface2)'):'var(--surface)', padding:'0 2px', borderRadius:5 }}>
            <button onClick={e=>{e.stopPropagation();setEditing(true)}} title="Editar"
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'transparent', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IconEditar size={12} aria-hidden="true" />
            </button>
            <button onClick={e=>{e.stopPropagation();setDs('confirm')}} title="Eliminar"
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'transparent', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IconEliminar size={12} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── McCol — columna del Miller Grid ──────────────────────────────────────────
function McCol({ title, dot, idx, mobileIdx, children, onAdd, addPh, addIcon, addUnit, units, addDis }) {
  return (
    <div className={`mc-col ${mobileIdx===idx?'mc-active':''}`}
      style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)', minHeight:0 }}>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
        {dot && <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />}
        <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)' }}>{title}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>{children}</div>
      {onAdd && <AddRow placeholder={addPh} withIcon={addIcon} withUnit={addUnit} units={units} onAdd={onAdd} disabled={addDis} />}
    </div>
  )
}

const Empty = ({label,cta}) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 14px', gap:6, color:'var(--text-muted)', textAlign:'center' }}>
    <span style={{ fontSize:24, opacity:.3 }}>📭</span>
    <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>
    {cta && <span style={{ fontSize:11, opacity:.6 }}>{cta}</span>}
  </div>
)

function useToast() {
  const [t, setT] = useState(null)
  const tmr = useRef(null)
  const show = useCallback((msg, type='ok') => {
    clearTimeout(tmr.current); setT({msg,type})
    tmr.current = setTimeout(()=>setT(null), 2800)
  }, [])
  return { toast:t, show }
}

// ── Lista de todos los ítems ──────────────────────────────────────────────────
function AllItemsList({ categories, units, onEditItem, onDeleteItem, searchQ }) {
  const [localQ, setLocalQ] = useState('')
  const q = searchQ || localQ

  const allItems = useMemo(() => {
    const seen = new Set()
    return categories
      .filter(r => r.n4_id && !seen.has(r.n4_id) && seen.add(r.n4_id))
      .map(r => ({ id:r.n4_id, nombre:r.n4, unidad:r.unidad, n1:r.n1, n2:r.n2, n3:r.n3,
        ruta:[r.n1,r.n2,r.n3].filter(Boolean).join(' › ') }))
      .filter(it => !q || it.nombre.toLowerCase().includes(q.toLowerCase()) || it.ruta.toLowerCase().includes(q.toLowerCase()))
      .sort((a,b) => a.ruta.localeCompare(b.ruta,'es')||a.nombre.localeCompare(b.nombre,'es'))
  }, [categories, q])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Buscador interno de la lista */}
      {!searchQ && (
        <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
          <div style={{ position:'relative' }}>
            <IconBuscar size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
            <input value={localQ} onChange={e=>setLocalQ(e.target.value)} placeholder="Buscar ítem…"
              style={{ width:'100%', padding:'5px 26px', border:'1.5px solid var(--border)', borderRadius:6, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12, outline:'none', boxSizing:'border-box' }} />
            {localQ && <button onClick={()=>setLocalQ('')} style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}><IconCerrar size={10} /></button>}
          </div>
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto' }}>
        {allItems.length === 0 ? (
          <Empty label="Sin ítems" cta={q ? `Sin resultados para "${q}"` : ''} />
        ) : (
          allItems.map(it => (
            <MRow key={it.id} id={it.id} label={it.nombre} unit={it.unidad}
              isItem selected={false} units={units}
              color={{ bg:'#64748b', light:'var(--surface2)', text:'#475569' }}
              onEdit={onEditItem} onDelete={onDeleteItem} />
          ))
        )}
      </div>
      <div style={{ padding:'6px 12px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{allItems.length} ítems{q ? ` (filtrado)` : ' en total'}</span>
      </div>
    </div>
  )
}

// ── Resultados de búsqueda plana ──────────────────────────────────────────────
function SearchResults({ categories, q, onNavigate }) {
  const results = useMemo(() => {
    if (!q || q.length < 1) return []
    const ql = q.toLowerCase()
    const hits = []
    const seenItems = new Set(), seenN2 = new Set(), seenN3 = new Set()

    categories.forEach(r => {
      // ítems
      if (r.n4 && r.n4.toLowerCase().includes(ql) && r.n4_id && !seenItems.has(r.n4_id)) {
        seenItems.add(r.n4_id)
        hits.push({ type:'item', id:r.n4_id, nombre:r.n4, unidad:r.unidad,
          ruta:[r.n1,r.n2,r.n3].filter(Boolean).join(' › '),
          n1_id:r.n1_id, n2_id:r.n2_id, n3_id:r.n3_id })
      }
      // N2
      if (r.n2 && r.n2.toLowerCase().includes(ql) && r.n2_id && !seenN2.has(r.n2_id)) {
        seenN2.add(r.n2_id)
        hits.push({ type:'n2', id:r.n2_id, nombre:r.n2, ruta:r.n1, n1_id:r.n1_id, n2_id:r.n2_id })
      }
      // N3
      if (r.n3 && r.n3.toLowerCase().includes(ql) && r.n3_id && !seenN3.has(r.n3_id)) {
        seenN3.add(r.n3_id)
        hits.push({ type:'n3', id:r.n3_id, nombre:r.n3, ruta:[r.n1,r.n2].filter(Boolean).join(' › '),
          n1_id:r.n1_id, n2_id:r.n2_id, n3_id:r.n3_id })
      }
    })
    return hits.slice(0, 40)
  }, [categories, q])

  if (!q) return null

  const TYPE_BADGE = { item:{ label:'Ítem', color:'#6366f1' }, n2:{ label:'Área', color:'#059669' }, n3:{ label:'Subcateg.', color:'#d97706' } }

  return (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'var(--surface)', border:'1.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 10px 10px', boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:280, overflowY:'auto' }}>
      {results.length === 0 ? (
        <div style={{ padding:'14px', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Sin resultados para "{q}"</div>
      ) : results.map((r,i) => {
        const b = TYPE_BADGE[r.type]
        return (
          <button key={i} onClick={() => onNavigate(r)}
            style={{ width:'100%', padding:'8px 12px', border:'none', borderBottom:'1px solid var(--border)', background:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ padding:'1px 6px', borderRadius:99, background:`${b.color}18`, color:b.color, fontSize:9, fontWeight:800, flexShrink:0 }}>{b.label}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.nombre}</div>
              {r.ruta && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{r.ruta}</div>}
            </div>
            {r.unidad && <span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>{r.unidad}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CatalogManager() {
  const { categories, loading, refetch } = useCategories()
  const { units } = useUnits()
  const [s1,      setS1]      = useState(null)
  const [s2,      setS2]      = useState(null)
  const [s3,      setS3]      = useState(null)
  const [q,       setQ]       = useState('')
  const [mc,      setMc]      = useState(0)
  const [view,    setView]    = useState('columns')  // 'columns' | 'list'
  const [showSR,  setShowSR]  = useState(false)
  const searchRef = useRef(null)
  const { toast, show: toast_ } = useToast()

  const tree = useMemo(() => buildTree(categories), [categories])

  // ── Listas filtradas ────────────────────────────────────────────────────────
  const n1List = useMemo(() => {
    if (!q || view === 'list') return tree.n1List
    // en búsqueda: mostrar todos los N1 que tienen coincidencias descendientes
    const ql = q.toLowerCase()
    return tree.n1List.filter(n1 => {
      if (n1.nombre.toLowerCase().includes(ql)) return true
      return categories.some(r => r.n1_id === n1.id && (
        (r.n2 && r.n2.toLowerCase().includes(ql)) ||
        (r.n3 && r.n3.toLowerCase().includes(ql)) ||
        (r.n4 && r.n4.toLowerCase().includes(ql))
      ))
    })
  }, [tree, q, categories, view])

  const n2List = useMemo(() => s1 ? tree.n2Of(s1) : [], [tree, s1])
  const n3List = useMemo(() => s2 ? tree.n3Of(s2) : [], [tree, s2])

  // ── Ítems del contexto seleccionado: mostrar TODOS bajo el nodo activo ──────
  const ctxItems = useMemo(() => {
    const seen = new Set()
    return categories
      .filter(r => {
        if (!r.n4_id) return false
        if (s3) return r.n3_id === s3
        if (s2) return r.n2_id === s2   // incluye ítems de n3 hijos
        if (s1) return r.n1_id === s1   // incluye ítems de n2 y n3 hijos
        return false
      })
      .filter(r => !seen.has(r.n4_id) && seen.add(r.n4_id))
      .map(r => ({ id:r.n4_id, nombre:r.n4, unidad:r.unidad,
        subruta:[r.n2,r.n3].filter(Boolean).join(' › ') }))
  }, [categories, s1, s2, s3])

  const countN1 = id => categories.filter(r=>r.n1_id===id&&r.n4_id).length
  const countN2 = id => categories.filter(r=>r.n2_id===id&&r.n4_id).length
  const countN3 = id => categories.filter(r=>r.n3_id===id&&r.n4_id).length

  const n1Color  = name => N1_COLORS[name] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
  const selColor = useMemo(() => {
    if (!s1) return null
    return n1Color(tree.n1List.find(n=>n.id===s1)?.nombre||'')
  }, [s1, tree])

  // ── API helpers ─────────────────────────────────────────────────────────────
  const post  = async b => { const r=await fetch('/api/categorias',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const put   = async (id,nombre) => { const r=await fetch('/api/categorias',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const del   = async id => { const r=await fetch(`/api/categorias?id=${id}`,{method:'DELETE'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const ipost = async b => { const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const iput  = async (id,nombre,unidad) => { const r=await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre,...(unidad?{unidad_default:unidad}:{})})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const idel  = async id => { const r=await fetch(`/api/items?id=${id}`,{method:'DELETE'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }

  // ── CRUD callbacks ──────────────────────────────────────────────────────────
  const addN1 = useCallback(async (nombre,icono) => {
    try { await post({nombre,icono,nivel:1,parent_id:null}); refetch(); toast_(`✓ Tipo "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [refetch])
  const addN2 = useCallback(async (nombre,icono) => {
    if(!s1) return
    try { await post({nombre,icono,nivel:2,parent_id:s1}); refetch(); toast_(`✓ Área "${nombre}" creada`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s1,refetch])
  const addN3 = useCallback(async (nombre) => {
    if(!s2) return
    try { await post({nombre,nivel:3,parent_id:s2}); refetch(); toast_(`✓ Subcategoría "${nombre}" creada`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s2,refetch])
  // addItem recibe (nombre, unidad) — la unidad viene del AddRow withUnit
  const addItem = useCallback(async (nombre, unidad) => {
    if(!s1) return
    const n1 = tree.n1List.find(n=>n.id===s1)?.nombre || null
    const n2 = s2 ? tree.n2Of(s1).find(n=>n.id===s2)?.nombre : null
    const n3 = s3 ? tree.n3Of(s2||'').find(n=>n.id===s3)?.nombre : null
    try { await ipost({nombre,unidad_default:unidad||'unidad',n1,n2,n3}); refetch(); toast_(`✓ Ítem "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s1,s2,s3,tree,refetch])

  const editCat  = useCallback(async (id,nombre) => {
    try { await put(id,nombre); refetch(); toast_('✓ Renombrado'); return true } catch(e) { toast_('⚠ '+e.message,'err'); return false }
  }, [refetch])
  const delCat   = useCallback(async (id,label) => {
    try { await del(id); refetch(); toast_(`✓ "${label}" eliminado`); return true } catch(e) { toast_('⚠ '+e.message,'err'); return e.message }
  }, [refetch])
  const editItem = useCallback(async (id,nombre,unidad) => {
    try { await iput(id,nombre,unidad); refetch(); toast_('✓ Ítem actualizado'); return true } catch(e) { toast_('⚠ '+e.message,'err'); return false }
  }, [refetch])
  const delItem  = useCallback(async (id,label) => {
    try { await idel(id); refetch(); toast_(`✓ "${label}" eliminado`); return true } catch(e) { toast_('⚠ '+e.message,'err'); return e.message }
  }, [refetch])

  // ── Navegar desde búsqueda ──────────────────────────────────────────────────
  const navigateTo = useCallback(result => {
    setQ(''); setShowSR(false); setView('columns')
    setS1(result.n1_id || null)
    setS2(result.type !== 'n2' && result.type !== 'item' ? null : result.n2_id || null)
    setS3(result.type === 'n3' || (result.type==='item' && result.n3_id) ? result.n3_id || null : null)
    if (result.type === 'n2') { setS2(result.n2_id); setS3(null); setMc(2) }
    else if (result.type === 'n3') { setS2(result.n2_id); setS3(result.n3_id); setMc(3) }
    else { setMc(3) }
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, gap:8, color:'var(--text-muted)' }}>
      <IconSpinner size={18} style={{ animation:'spin .8s linear infinite' }} aria-hidden="true" />
      <span style={{ fontSize:13 }}>Cargando catálogo…</span>
    </div>
  )

  const n1node = s1 ? tree.n1List.find(n=>n.id===s1) : null
  const n2node = s2 ? tree.n2Of(s1||'').find(n=>n.id===s2) : null
  const n3node = s3 ? tree.n3Of(s2||'').find(n=>n.id===s3) : null

  // Título de la col 4 según contexto
  const itemsColTitle = s3 ? `Ítems en ${n3node?.nombre||'…'}` : s2 ? `Ítems en ${n2node?.nombre||'…'}` : s1 ? `Ítems en ${n1node?.nombre||'…'}` : 'Ítems'

  return (
    <div>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes popUp{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .mrow:hover { background: var(--surface2) !important; }
        .mrow:hover .mrow-actions { display:flex !important; }
        .mc-grid { display:grid; grid-template-columns:repeat(4,1fr); }
        .mc-col { display:flex; }
        @media (max-width:680px) {
          .mc-grid { display:block; }
          .mc-col { display:none; }
          .mc-active { display:flex; }
          .mc-mobile-nav { display:flex !important; }
        }
        .mc-mobile-nav { display:none; gap:4px; flex-wrap:wrap; }
      `}</style>

      {/* ── Barra superior: búsqueda + toggle vista ─────────────────────── */}
      <div style={{ padding:'9px 10px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>

        {/* Buscador con dropdown de resultados */}
        <div ref={searchRef} style={{ position:'relative', flex:'1 1 160px' }}>
          <IconBuscar size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none', zIndex:1 }} aria-hidden="true" />
          <input value={q}
            onChange={e => { setQ(e.target.value); setShowSR(!!e.target.value); if(!e.target.value){setS1(null);setS2(null);setS3(null)} }}
            onFocus={() => q && setShowSR(true)}
            onBlur={() => setTimeout(()=>setShowSR(false), 180)}
            placeholder="Buscar ítems, áreas, subcategorías…"
            style={{ width:'100%', padding:'6px 28px', border:'1.5px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12, outline:'none', boxSizing:'border-box' }} />
          {q && <button onClick={()=>{setQ('');setShowSR(false)}} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex', zIndex:1 }}><IconCerrar size={11} /></button>}
          {showSR && <SearchResults categories={categories} q={q} onNavigate={navigateTo} />}
        </div>

        {/* Toggle vista columnas / lista */}
        <div style={{ display:'flex', border:'1.5px solid var(--border)', borderRadius:7, overflow:'hidden', flexShrink:0 }}>
          <button onClick={()=>setView('columns')}
            style={{ padding:'5px 12px', border:'none', background:view==='columns'?'var(--accent)':'transparent', color:view==='columns'?'#fff':'var(--text-muted)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
            ⫿ Columnas
          </button>
          <button onClick={()=>setView('list')}
            style={{ padding:'5px 12px', border:'none', borderLeft:'1px solid var(--border)', background:view==='list'?'var(--accent)':'transparent', color:view==='list'?'#fff':'var(--text-muted)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
            ☰ Todos los ítems
          </button>
        </div>

        {/* Mobile nav pills (solo columnas) */}
        {view==='columns' && (
          <div className="mc-mobile-nav" aria-label="Columna activa">
            {['Tipo','Área','Subcateg.','Ítems'].map((l,i)=>(
              <button key={i} onClick={()=>setMc(i)}
                style={{ padding:'5px 10px', border:`1.5px solid ${mc===i?'var(--accent)':'var(--border)'}`, borderRadius:99, background:mc===i?'var(--accent)':'transparent', color:mc===i?'#fff':'var(--text-muted)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Vista lista total de ítems ─────────────────────────────────────── */}
      {view === 'list' && (
        <div style={{ border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden', background:'var(--surface)', minHeight:360, maxHeight:520, display:'flex', flexDirection:'column' }}>
          <AllItemsList categories={categories} units={units} onEditItem={editItem} onDeleteItem={delItem} searchQ={q} />
        </div>
      )}

      {/* ── Vista Miller Columns ───────────────────────────────────────────── */}
      {view === 'columns' && (
        <>
          {/* Breadcrumb */}
          {(s1||s2||s3) && (
            <div style={{ padding:'5px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', background:'var(--surface)' }}>
              <button onClick={()=>{setS1(null);setS2(null);setS3(null);setMc(0)}} style={{ border:'none', background:'none', cursor:'pointer', fontSize:11, color:'var(--accent)', fontWeight:600, padding:0 }}>Catálogo</button>
              {n1node && (<>
                <span style={{ color:'var(--text-muted)', fontSize:10 }}>›</span>
                <button onClick={()=>{setS2(null);setS3(null);setMc(1)}} style={{ border:'none', background:'none', cursor:'pointer', fontSize:11, color:(selColor?.text||selColor?.bg||'var(--text-secondary)'), fontWeight:600, padding:0 }}>{n1node.icono} {n1node.nombre}</button>
              </>)}
              {n2node && (<>
                <span style={{ color:'var(--text-muted)', fontSize:10 }}>›</span>
                <button onClick={()=>{setS3(null);setMc(2)}} style={{ border:'none', background:'none', cursor:'pointer', fontSize:11, color:'var(--text-secondary)', fontWeight:600, padding:0 }}>{n2node.nombre}</button>
              </>)}
              {n3node && (<>
                <span style={{ color:'var(--text-muted)', fontSize:10 }}>›</span>
                <span style={{ fontSize:11, color:'var(--text-primary)', fontWeight:700 }}>{n3node.nombre}</span>
              </>)}
            </div>
          )}

          <div className="mc-grid" style={{ border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden', background:'var(--surface)', minHeight:360, maxHeight:500 }}>

            {/* Col 1 — N1 */}
            <McCol title={COL_LABELS[0]} idx={0} mobileIdx={mc}
              onAdd={addN1} addPh="Nombre del tipo…" addIcon addDis={false} units={units}>
              {n1List.length===0
                ? <Empty label={q?'Sin resultados':'Sin tipos todavía'} cta="Usá ＋ para agregar" />
                : n1List.map(n1=>(
                    <MRow key={n1.id} id={n1.id} label={n1.nombre} icon={n1.icono}
                      count={countN1(n1.id)} selected={s1===n1.id}
                      color={n1Color(n1.nombre)}
                      onSelect={()=>{setS1(n1.id);setS2(null);setS3(null);setMc(1)}}
                      onEdit={editCat} onDelete={delCat} />
                  ))
              }
            </McCol>

            {/* Col 2 — N2 */}
            <McCol title={COL_LABELS[1]} dot={selColor?.bg} idx={1} mobileIdx={mc}
              onAdd={s1?addN2:undefined} addPh="Nombre del área…" addIcon addDis={!s1} units={units}>
              {!s1 ? <Empty label="Seleccioná un Tipo" cta="← izquierda" />
              : n2List.length===0 ? <Empty label="Sin áreas" cta="Opcional. Podés agregar ítems directo al Tipo." />
              : n2List.map(n2=>(
                  <MRow key={n2.id} id={n2.id} label={n2.nombre}
                    count={countN2(n2.id)} selected={s2===n2.id}
                    color={selColor}
                    onSelect={()=>{setS2(n2.id);setS3(null);setMc(2)}}
                    onEdit={editCat} onDelete={delCat} />
                ))
              }
            </McCol>

            {/* Col 3 — N3 */}
            <McCol title={COL_LABELS[2]} idx={2} mobileIdx={mc}
              onAdd={s2?addN3:undefined} addPh="Nombre de subcategoría…" addDis={!s2} units={units}>
              {!s2 ? <Empty label="Seleccioná un Área" cta="← anterior" />
              : n3List.length===0 ? <Empty label="Sin subcategorías" cta="Opcional. Podés agregar ítems al Área." />
              : n3List.map(n3=>(
                  <MRow key={n3.id} id={n3.id} label={n3.nombre}
                    count={countN3(n3.id)} selected={s3===n3.id}
                    color={selColor}
                    onSelect={()=>{setS3(n3.id);setMc(3)}}
                    onEdit={editCat} onDelete={delCat} />
                ))
              }
            </McCol>

            {/* Col 4 — Items del contexto seleccionado */}
            <McCol title={itemsColTitle} idx={3} mobileIdx={mc}
              onAdd={s1?addItem:undefined} addPh="Nombre del ítem…" addUnit={true} addDis={!s1} units={units}>
              {!s1 ? <Empty label="Seleccioná un nivel" cta="← navegar primero" />
              : ctxItems.length===0 ? <Empty label="Sin ítems aquí" cta="Usá ＋ para agregar" />
              : ctxItems.map(it=>(
                  <div key={it.id}>
                    {/* subruta visible si hay más de un nivel de contexto */}
                    {!s3 && it.subruta && (
                      <div style={{ paddingLeft:18, paddingTop:4, fontSize:9, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>
                        {it.subruta}
                      </div>
                    )}
                    <MRow id={it.id} label={it.nombre} unit={it.unidad}
                      isItem selected={false} color={selColor} units={units}
                      onEdit={editItem} onDelete={delItem} />
                  </div>
                ))
              }
            </McCol>
          </div>
        </>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
          background:toast.type==='err'?'#fee2e2':'var(--surface)',
          color:toast.type==='err'?'#dc2626':'var(--text-primary)',
          border:`1.5px solid ${toast.type==='err'?'#fecaca':'var(--border)'}`,
          borderRadius:10, padding:'8px 18px', fontSize:13, fontWeight:600,
          boxShadow:'0 8px 24px rgba(0,0,0,.15)', zIndex:9999, whiteSpace:'nowrap',
          animation:'popUp .2s ease' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
