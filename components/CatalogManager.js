'use client'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { N1_COLORS } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import { useItems } from '../lib/useItems'
import { useUnits } from '../lib/useUnits'
import {
  IconPlus, IconEditar, IconEliminar, IconCaretRight,
  IconSpinner, IconCerrar, IconCheck, IconBuscar,
} from '../lib/icons'

const COL_LABELS = ['Tipo (N1)', 'Área (N2)', 'Subcategoría (N3)', 'Ítems']
const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱','🌿','🎓','🏥','💰','🔑','🍕','🎵','🏖️']

// ── Build category tree from flat ─────────────────────────────────────────────
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

// ── AddRow — footer inline con input (+ selector de unidad opcional) ──────────
function AddRow({ placeholder, withIcon, withUnit, units, onAdd, disabled }) {
  const [open, setOpen] = useState(false)
  const [val,  setVal]  = useState('')
  const [ico,  setIco]  = useState('📦')
  const [unit, setUnit] = useState('unidad')
  const [busy, setBusy] = useState(false)
  const inp = useRef(null)

  const open_ = () => { if (!disabled) { setOpen(true); setTimeout(() => inp.current?.focus(), 40) } }
  const close  = () => { setOpen(false); setVal(''); setUnit('unidad') }
  const submit = async () => {
    if (!val.trim() || busy) return
    setBusy(true)
    // para categorías pasamos (nombre, icono), para ítems (nombre, unidad)
    await onAdd(val.trim(), withIcon ? ico : unit)
    setBusy(false); close()
  }

  return (
    <div style={{ borderTop:'1px solid var(--border)', padding:'6px 8px', flexShrink:0, background:'var(--surface2)' }}>
      {!open ? (
        <button onClick={open_} disabled={disabled}
          style={{ width:'100%', padding:'5px 10px', border:'1.5px dashed var(--border)', borderRadius:8,
            background:'transparent', color:disabled?'var(--text-muted)':'var(--accent)',
            fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:disabled?'not-allowed':'pointer',
            display:'flex', alignItems:'center', gap:5, opacity:disabled?.4:1 }}>
          <IconPlus size={11} aria-hidden="true" />Agregar…
        </button>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {withIcon && (
              <span onClick={() => setIco(ICONOS[(ICONOS.indexOf(ico)+1)%ICONOS.length])}
                style={{ fontSize:15, cursor:'pointer', flexShrink:0 }} title="Click para cambiar">{ico}</span>
            )}
            <input ref={inp} value={val} onChange={e=>setVal(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') submit(); if(e.key==='Escape') close() }}
              placeholder={placeholder}
              style={{ flex:1, padding:'5px 8px', border:'1.5px solid var(--accent)', borderRadius:6,
                background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit',
                fontSize:12, outline:'none', minWidth:0 }} />
            <button onClick={submit} disabled={!val.trim()||busy}
              style={{ width:26, height:26, border:'none', borderRadius:6,
                background:val.trim()?'var(--accent)':'var(--border)', color:'#fff',
                cursor:val.trim()?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {busy ? <IconSpinner size={11} style={{ animation:'spin .8s linear infinite' }}/> : <IconCheck size={11}/>}
            </button>
            <button onClick={close}
              style={{ width:26, height:26, border:'none', borderRadius:6, background:'var(--surface3,#f1f5f9)',
                color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <IconCerrar size={11}/>
            </button>
          </div>
          {withUnit && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, flexShrink:0 }}>Unidad:</span>
              <select value={unit} onChange={e=>setUnit(e.target.value)}
                style={{ flex:1, padding:'3px 6px', border:'1px solid var(--border)', borderRadius:5,
                  background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:11, outline:'none' }}>
                {(units?.length ? units : ['unidad','kg','g','l','ml','docena','caja','pack']).map(u=>(
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MRow — fila individual (categoría o ítem) ─────────────────────────────────
function MRow({ id, label, icon, unit, count, selected, color, onSelect, onEdit, onDelete, isItem, units, subruta }) {
  const [editing, setEditing] = useState(false)
  const [ev,  setEv]  = useState(label)
  const [eu,  setEu]  = useState(unit || '')
  const [ds,  setDs]  = useState(null)  // null | 'confirm' | 'err:msg'
  const [busy,setBusy]= useState(false)
  const inp = useRef(null)
  useEffect(() => { if (editing) setTimeout(()=>inp.current?.focus(), 40) }, [editing])

  const saveEdit = async () => {
    if (!ev.trim() || ev===label || busy) return
    setBusy(true)
    const ok = await onEdit(id, ev.trim(), isItem ? eu : undefined)
    setBusy(false)
    if (ok) setEditing(false); else setEv(label)
  }
  const confirmDel = async () => {
    setBusy(true); const r = await onDelete(id, label); setBusy(false)
    if (r !== true) setDs('err:' + r); else setDs(null)
  }

  const c = color || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }

  if (typeof ds==='string' && ds.startsWith('err:')) return (
    <div style={{ margin:'2px 4px', padding:'7px 10px', background:'#fee2e2', borderRadius:8, fontSize:11 }}>
      <div style={{ color:'#dc2626', fontWeight:700, marginBottom:3 }}>⚠ {ds.slice(4)}</div>
      <button onClick={()=>setDs(null)} style={{ fontSize:11, padding:'2px 8px', border:'none', borderRadius:4, background:'#fecaca', color:'#b91c1c', cursor:'pointer' }}>OK</button>
    </div>
  )
  if (ds==='confirm') return (
    <div style={{ margin:'2px 4px', padding:'7px 10px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, fontSize:11 }}>
      <div style={{ fontWeight:700, color:'#c2410c', marginBottom:4 }}>¿Eliminar "{label}"?</div>
      <div style={{ display:'flex', gap:5 }}>
        <button onClick={confirmDel} disabled={busy}
          style={{ padding:'3px 10px', border:'none', borderRadius:5, background:'#ef4444', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer' }}>
          {busy?'…':'Sí, eliminar'}
        </button>
        <button onClick={()=>setDs(null)}
          style={{ padding:'3px 8px', border:'1px solid var(--border)', borderRadius:5, background:'transparent', color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>
          Cancelar
        </button>
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
        : <span style={{ width:7, height:7, borderRadius:'50%', background:c.bg, flexShrink:0 }}/>}

      {editing ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4, minWidth:0 }} onClick={e=>e.stopPropagation()}>
          <div style={{ display:'flex', gap:4 }}>
            <input ref={inp} value={ev} onChange={e=>setEv(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape'){setEditing(false);setEv(label)} }}
              style={{ flex:1, padding:'3px 7px', border:'1.5px solid var(--accent)', borderRadius:5,
                background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:13, outline:'none', minWidth:0 }}/>
            <button onClick={saveEdit} disabled={busy}
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'var(--accent)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {busy ? <IconSpinner size={10} style={{ animation:'spin .8s linear infinite' }}/> : <IconCheck size={10}/>}
            </button>
            <button onClick={()=>{setEditing(false);setEv(label)}}
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <IconCerrar size={10}/>
            </button>
          </div>
          {isItem && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>Unidad:</span>
              <select value={eu} onChange={e=>setEu(e.target.value)}
                style={{ flex:1, padding:'2px 6px', border:'1px solid var(--border)', borderRadius:4,
                  background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:11, outline:'none' }}>
                {(units?.length ? units : ['unidad','kg','g','l','ml','docena','caja','pack']).map(u=>(
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:selected?700:500, color:selected?(c.text||c.bg):'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {label}
              {unit && <span style={{ marginLeft:5, fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>{unit}</span>}
            </div>
            {subruta && (
              <div style={{ fontSize:10, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{subruta}</div>
            )}
          </div>
          {count>0 && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', flexShrink:0 }}>{count}</span>}
          {!isItem && onSelect && <IconCaretRight size={10} color="var(--text-muted)" style={{ flexShrink:0 }} aria-hidden="true"/>}
          <div className="mrow-actions" style={{ display:'none', gap:2, position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            background:selected?(c.light||'var(--surface2)'):'var(--surface)', padding:'0 2px', borderRadius:5 }}>
            <button onClick={e=>{e.stopPropagation();setEditing(true)}} title="Editar"
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'transparent', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IconEditar size={12} aria-hidden="true"/>
            </button>
            <button onClick={e=>{e.stopPropagation();setDs('confirm')}} title="Eliminar"
              style={{ width:22, height:22, border:'none', borderRadius:4, background:'transparent', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IconEliminar size={12} aria-hidden="true"/>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── McCol — columna del grid ──────────────────────────────────────────────────
function McCol({ title, dot, idx, mobileIdx, children, onAdd, addPh, addIcon, addUnit, units, addDis }) {
  return (
    <div className={`mc-col ${mobileIdx===idx?'mc-active':''}`}
      style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)', minHeight:0 }}>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
        {dot && <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }}/>}
        <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)' }}>{title}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>{children}</div>
      {onAdd && <AddRow placeholder={addPh} withIcon={addIcon} withUnit={addUnit} units={units} onAdd={onAdd} disabled={addDis}/>}
    </div>
  )
}

const Empty = ({label, cta}) => (
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

// ── SearchResults — dropdown búsqueda en cats + items ────────────────────────
function SearchResults({ categories, items, q, onNavigate }) {
  const results = useMemo(() => {
    if (!q || q.length < 1) return []
    const ql = q.toLowerCase()
    const hits = []
    const seenN2=new Set(), seenN3=new Set(), seenItem=new Set()
    categories.forEach(r => {
      if (r.n2 && r.n2.toLowerCase().includes(ql) && r.n2_id && !seenN2.has(r.n2_id)) {
        seenN2.add(r.n2_id)
        hits.push({ type:'n2', id:r.n2_id, nombre:r.n2, ruta:r.n1, n1_id:r.n1_id, n2_id:r.n2_id })
      }
      if (r.n3 && r.n3.toLowerCase().includes(ql) && r.n3_id && !seenN3.has(r.n3_id)) {
        seenN3.add(r.n3_id)
        hits.push({ type:'n3', id:r.n3_id, nombre:r.n3, ruta:[r.n1,r.n2].filter(Boolean).join(' › '), n1_id:r.n1_id, n2_id:r.n2_id, n3_id:r.n3_id })
      }
    })
    items.forEach(it => {
      if (it.nombre.toLowerCase().includes(ql) && !seenItem.has(it.id)) {
        seenItem.add(it.id)
        hits.push({ type:'item', id:it.id, nombre:it.nombre, unidad:it.unidad_default,
          ruta:[it.n1,it.n2,it.n3].filter(Boolean).join(' › '), n1:it.n1, n2:it.n2, n3:it.n3 })
      }
    })
    return hits.slice(0, 40)
  }, [categories, items, q])

  if (!q || results.length === 0) return q ? (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'var(--surface)', border:'1.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 10px 10px', padding:'12px', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
      Sin resultados para "{q}"
    </div>
  ) : null

  const BADGE = { item:{label:'Ítem',color:'#6366f1'}, n2:{label:'Área',color:'#059669'}, n3:{label:'Subcateg.',color:'#d97706'} }

  return (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'var(--surface)', border:'1.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 10px 10px', boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:280, overflowY:'auto' }}>
      {results.map((r,i) => {
        const b = BADGE[r.type]
        return (
          <button key={i} onClick={()=>onNavigate(r)}
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

// ── AllItemsList — vista completa de todos los ítems ─────────────────────────
function AllItemsList({ items, units, onEditItem, onDeleteItem, refetchItems }) {
  const [localQ, setLocalQ] = useState('')

  const filtered = useMemo(() => {
    if (!localQ) return items
    const ql = localQ.toLowerCase()
    return items.filter(it =>
      it.nombre.toLowerCase().includes(ql) ||
      (it.n1||'').toLowerCase().includes(ql) ||
      (it.n2||'').toLowerCase().includes(ql) ||
      (it.n3||'').toLowerCase().includes(ql)
    )
  }, [items, localQ])

  // Agrupar por N1 para mostrar secciones
  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach(it => {
      const key = it.n1 || '(Sin tipo)'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(it)
    })
    return [...map.entries()]
  }, [filtered])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <IconBuscar size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
          <input value={localQ} onChange={e=>setLocalQ(e.target.value)} placeholder="Buscar ítem, tipo, área…"
            style={{ width:'100%', padding:'5px 26px', border:'1.5px solid var(--border)', borderRadius:6, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
          {localQ && <button onClick={()=>setLocalQ('')} style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}><IconCerrar size={10}/></button>}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {grouped.length === 0 ? (
          <Empty label="Sin ítems" cta={localQ ? `Sin resultados para "${localQ}"` : 'Agregar ítems desde la vista de columnas'}/>
        ) : grouped.map(([n1, itList]) => {
          const c = N1_COLORS[n1] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
          return (
            <div key={n1}>
              <div style={{ padding:'6px 14px 3px', display:'flex', alignItems:'center', gap:6, position:'sticky', top:0, background:'var(--surface)', zIndex:1, borderBottom:'1px solid var(--border)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:c.bg, flexShrink:0 }}/>
                <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:c.text||c.bg }}>{n1}</span>
                <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{itList.length}</span>
              </div>
              {itList.map(it => (
                <MRow key={it.id} id={it.id} label={it.nombre} unit={it.unidad_default}
                  isItem selected={false} units={units}
                  subruta={[it.n2,it.n3].filter(Boolean).join(' › ') || undefined}
                  color={c}
                  onEdit={async (id, nombre, unidad) => {
                    try {
                      const r = await fetch('/api/items', { method:'PUT', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ id, nombre, n1:it.n1, n2:it.n2, n3:it.n3, unidad_default: unidad||it.unidad_default }) })
                      const d = await r.json()
                      if (!r.ok) throw new Error(d.error)
                      refetchItems(); return true
                    } catch(e) { return false }
                  }}
                  onDelete={async (id, label) => {
                    try {
                      const r = await fetch(`/api/items?id=${id}`, { method:'DELETE' })
                      const d = await r.json()
                      if (!r.ok) throw new Error(d.error)
                      refetchItems(); return true
                    } catch(e) { return e.message }
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>

      <div style={{ padding:'6px 12px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
          {filtered.length} ítem{filtered.length!==1?'s':''}{localQ?` (filtrado de ${items.length})`:''}
        </span>
      </div>
    </div>
  )
}

// ── Main CatalogManager ───────────────────────────────────────────────────────
export default function CatalogManager() {
  const { categories, loading: catLoading, refetch: refetchCats } = useCategories()
  const { items, loading: itemLoading, refetch: refetchItems } = useItems()
  const { units } = useUnits()

  const [s1, setS1] = useState(null)   // nombre N1 seleccionado
  const [s2, setS2] = useState(null)   // nombre N2
  const [s3, setS3] = useState(null)   // nombre N3
  const [s1id, setS1id] = useState(null)
  const [s2id, setS2id] = useState(null)
  const [s3id, setS3id] = useState(null)
  const [q,    setQ]    = useState('')
  const [mc,   setMc]   = useState(0)
  const [view, setView] = useState('columns')
  const [showSR, setShowSR] = useState(false)
  const searchRef = useRef(null)
  const { toast, show: toast_ } = useToast()

  const refetch = useCallback(() => { refetchCats(); refetchItems() }, [refetchCats, refetchItems])

  const tree = useMemo(() => buildTree(categories), [categories])

  // ── Listas de categorías ────────────────────────────────────────────────────
  const n1List = useMemo(() => tree.n1List, [tree])
  const n2List = useMemo(() => s1id ? tree.n2Of(s1id) : [], [tree, s1id])
  const n3List = useMemo(() => s2id ? tree.n3Of(s2id) : [], [tree, s2id])

  // ── Ítems del contexto seleccionado ─────────────────────────────────────────
  // Filtra items por nombre de categoría (n1, n2, n3)
  const ctxItems = useMemo(() => {
    if (!s1) return []
    return items.filter(it => {
      if (it.n1 !== s1) return false
      if (s3) return it.n3 === s3
      if (s2) return it.n2 === s2   // incluye ítems de todos los n3 bajo n2
      return true                    // todos los ítems del n1
    })
  }, [items, s1, s2, s3])

  // Contar ítems por categoría
  const countN1 = useCallback(nombre => items.filter(it=>it.n1===nombre).length, [items])
  const countN2 = useCallback(nombre => items.filter(it=>it.n2===nombre).length, [items])
  const countN3 = useCallback(nombre => items.filter(it=>it.n3===nombre).length, [items])

  const n1Color  = useCallback(name => N1_COLORS[name] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }, [])
  const selColor = useMemo(() => s1 ? n1Color(s1) : null, [s1, n1Color])

  // ── API categorías ──────────────────────────────────────────────────────────
  const catPost = async b => { const r=await fetch('/api/categorias',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const catPut  = async (id,nombre) => { const r=await fetch('/api/categorias',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const catDel  = async id => { const r=await fetch(`/api/categorias?id=${id}`,{method:'DELETE'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }

  // ── API ítems ───────────────────────────────────────────────────────────────
  const itemPost = async b => { const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const itemPut  = async b => { const r=await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const itemDel  = async id => { const r=await fetch(`/api/items?id=${id}`,{method:'DELETE'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }

  // ── CRUD callbacks ──────────────────────────────────────────────────────────
  const addN1   = useCallback(async (nombre,icono) => {
    try { await catPost({nombre,icono,nivel:1,parent_id:null}); refetchCats(); toast_(`✓ "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [refetchCats])
  const addN2   = useCallback(async (nombre,icono) => {
    if(!s1id) return
    try { await catPost({nombre,icono,nivel:2,parent_id:s1id}); refetchCats(); toast_(`✓ "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s1id,refetchCats])
  const addN3   = useCallback(async (nombre) => {
    if(!s2id) return
    try { await catPost({nombre,nivel:3,parent_id:s2id}); refetchCats(); toast_(`✓ "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s2id,refetchCats])
  const addItem = useCallback(async (nombre, unidad) => {
    if (!s1) return
    try {
      await itemPost({ nombre, n1:s1, n2:s2||null, n3:s3||null, unidad_default:unidad||'unidad' })
      refetchItems(); toast_(`✓ Ítem "${nombre}" creado`)
    } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s1,s2,s3,refetchItems])

  const editCat  = useCallback(async (id,nombre) => {
    try { await catPut(id,nombre); refetchCats(); toast_('✓ Renombrado'); return true } catch(e) { toast_('⚠ '+e.message,'err'); return false }
  }, [refetchCats])
  const delCat   = useCallback(async (id,label) => {
    try { await catDel(id); refetchCats(); toast_(`✓ "${label}" eliminado`); return true } catch(e) { toast_('⚠ '+e.message,'err'); return e.message }
  }, [refetchCats])
  const editItem = useCallback(async (id, nombre, unidad) => {
    const it = items.find(i=>i.id===id)
    if (!it) return false
    try { await itemPut({ id, nombre, n1:it.n1, n2:it.n2, n3:it.n3, unidad_default:unidad||it.unidad_default }); refetchItems(); toast_('✓ Ítem actualizado'); return true } catch(e) { toast_('⚠ '+e.message,'err'); return false }
  }, [items,refetchItems])
  const delItem  = useCallback(async (id,label) => {
    try { await itemDel(id); refetchItems(); toast_(`✓ "${label}" eliminado`); return true } catch(e) { toast_('⚠ '+e.message,'err'); return e.message }
  }, [refetchItems])

  // ── Select de categoría (guarda nombre e id) ────────────────────────────────
  const selN1 = (node) => { setS1(node.nombre); setS1id(node.id); setS2(null); setS2id(null); setS3(null); setS3id(null); setMc(1) }
  const selN2 = (node) => { setS2(node.nombre); setS2id(node.id); setS3(null); setS3id(null); setMc(2) }
  const selN3 = (node) => { setS3(node.nombre); setS3id(node.id); setMc(3) }
  const clearSel = () => { setS1(null);setS1id(null);setS2(null);setS2id(null);setS3(null);setS3id(null);setMc(0) }

  // ── Navegar desde búsqueda ──────────────────────────────────────────────────
  const navigateTo = useCallback(result => {
    setQ(''); setShowSR(false); setView('columns')
    if (result.type === 'item') {
      // Buscar IDs de las categorías por nombre
      const n1node = tree.n1List.find(n=>n.nombre===result.n1)
      const n2node = result.n2 ? tree.n2Of(n1node?.id||'').find(n=>n.nombre===result.n2) : null
      const n3node = result.n3 ? tree.n3Of(n2node?.id||'').find(n=>n.nombre===result.n3) : null
      setS1(result.n1); setS1id(n1node?.id||null)
      setS2(result.n2||null); setS2id(n2node?.id||null)
      setS3(result.n3||null); setS3id(n3node?.id||null)
      setMc(3)
    } else if (result.type === 'n2') {
      const n1node = tree.n1List.find(n=>n.id===result.n1_id)
      setS1(n1node?.nombre||null); setS1id(result.n1_id)
      setS2(result.nombre); setS2id(result.n2_id)
      setS3(null); setS3id(null); setMc(2)
    } else if (result.type === 'n3') {
      const n1node = tree.n1List.find(n=>n.id===result.n1_id)
      const n2node = tree.n2Of(result.n1_id).find(n=>n.id===result.n2_id)
      setS1(n1node?.nombre||null); setS1id(result.n1_id)
      setS2(n2node?.nombre||null); setS2id(result.n2_id)
      setS3(result.nombre); setS3id(result.n3_id); setMc(3)
    }
  }, [tree])

  const loading = catLoading || itemLoading

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, gap:8, color:'var(--text-muted)' }}>
      <IconSpinner size={18} style={{ animation:'spin .8s linear infinite' }} aria-hidden="true"/>
      <span style={{ fontSize:13 }}>Cargando catálogo…</span>
    </div>
  )

  const n1node = s1id ? tree.n1List.find(n=>n.id===s1id) : null
  const n2node = s2id ? tree.n2Of(s1id||'').find(n=>n.id===s2id) : null
  const n3node = s3id ? tree.n3Of(s2id||'').find(n=>n.id===s3id) : null

  const itemsTitle = s3 ? `Ítems — ${s3}` : s2 ? `Ítems — ${s2}` : s1 ? `Ítems — ${s1}` : 'Ítems'

  return (
    <div>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes popUp{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .mrow:hover{background:var(--surface2)!important;}
        .mrow:hover .mrow-actions{display:flex!important;}
        .mc-grid{display:grid;grid-template-columns:repeat(4,1fr);}
        .mc-col{display:flex;}
        @media(max-width:680px){
          .mc-grid{display:block;}
          .mc-col{display:none;}
          .mc-active{display:flex;}
          .mc-mobile-nav{display:flex!important;}
        }
        .mc-mobile-nav{display:none;gap:4px;flex-wrap:wrap;}
      `}</style>

      {/* ── Barra superior ───────────────────────────────────────────────── */}
      <div style={{ padding:'9px 10px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>

        {/* Buscador */}
        <div ref={searchRef} style={{ position:'relative', flex:'1 1 160px' }}>
          <IconBuscar size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none', zIndex:1 }} aria-hidden="true"/>
          <input value={q}
            onChange={e=>{ setQ(e.target.value); setShowSR(!!e.target.value) }}
            onFocus={()=> q && setShowSR(true)}
            onBlur={()=> setTimeout(()=>setShowSR(false), 200)}
            placeholder="Buscar ítems, áreas, subcategorías…"
            style={{ width:'100%', padding:'6px 28px', border:'1.5px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
          {q && <button onClick={()=>{setQ('');setShowSR(false)}} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex', zIndex:1 }}><IconCerrar size={11}/></button>}
          {showSR && <SearchResults categories={categories} items={items} q={q} onNavigate={navigateTo}/>}
        </div>

        {/* Toggle vista */}
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

        {/* Mobile nav */}
        {view==='columns' && (
          <div className="mc-mobile-nav">
            {['Tipo','Área','Subcateg.','Ítems'].map((l,i)=>(
              <button key={i} onClick={()=>setMc(i)}
                style={{ padding:'5px 10px', border:`1.5px solid ${mc===i?'var(--accent)':'var(--border)'}`, borderRadius:99, background:mc===i?'var(--accent)':'transparent', color:mc===i?'#fff':'var(--text-muted)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Vista lista completa de ítems ─────────────────────────────────── */}
      {view==='list' && (
        <div style={{ border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden', background:'var(--surface)', display:'flex', flexDirection:'column' }}>
          <AllItemsList items={items} units={units} onEditItem={editItem} onDeleteItem={delItem} refetchItems={refetchItems}/>
        </div>
      )}

      {/* ── Vista Miller Columns ───────────────────────────────────────────── */}
      {view==='columns' && (
        <>
          {/* Breadcrumb */}
          {(s1||s2||s3) && (
            <div style={{ padding:'5px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', background:'var(--surface)' }}>
              <button onClick={clearSel} style={{ border:'none', background:'none', cursor:'pointer', fontSize:11, color:'var(--accent)', fontWeight:600, padding:0 }}>Catálogo</button>
              {n1node && (<>
                <span style={{ color:'var(--text-muted)', fontSize:10 }}>›</span>
                <button onClick={()=>{setS2(null);setS2id(null);setS3(null);setS3id(null);setMc(1)}} style={{ border:'none', background:'none', cursor:'pointer', fontSize:11, color:(selColor?.text||selColor?.bg||'var(--text-secondary)'), fontWeight:600, padding:0 }}>{n1node.icono} {n1node.nombre}</button>
              </>)}
              {n2node && (<>
                <span style={{ color:'var(--text-muted)', fontSize:10 }}>›</span>
                <button onClick={()=>{setS3(null);setS3id(null);setMc(2)}} style={{ border:'none', background:'none', cursor:'pointer', fontSize:11, color:'var(--text-secondary)', fontWeight:600, padding:0 }}>{n2node.nombre}</button>
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
                ? <Empty label="Sin tipos todavía" cta="Usá ＋ para agregar"/>
                : n1List.map(n1=>(
                    <MRow key={n1.id} id={n1.id} label={n1.nombre} icon={n1.icono}
                      count={countN1(n1.nombre)} selected={s1id===n1.id}
                      color={n1Color(n1.nombre)}
                      onSelect={()=>selN1(n1)}
                      onEdit={editCat} onDelete={delCat}/>
                  ))
              }
            </McCol>

            {/* Col 2 — N2 */}
            <McCol title={COL_LABELS[1]} dot={selColor?.bg} idx={1} mobileIdx={mc}
              onAdd={s1id?addN2:undefined} addPh="Nombre del área…" addIcon addDis={!s1id} units={units}>
              {!s1 ? <Empty label="Seleccioná un Tipo" cta="← izquierda"/>
              : n2List.length===0 ? <Empty label="Sin áreas" cta="Opcional — podés agregar ítems directo al Tipo"/>
              : n2List.map(n2=>(
                  <MRow key={n2.id} id={n2.id} label={n2.nombre}
                    count={countN2(n2.nombre)} selected={s2id===n2.id}
                    color={selColor}
                    onSelect={()=>selN2(n2)}
                    onEdit={editCat} onDelete={delCat}/>
                ))
              }
            </McCol>

            {/* Col 3 — N3 */}
            <McCol title={COL_LABELS[2]} idx={2} mobileIdx={mc}
              onAdd={s2id?addN3:undefined} addPh="Nombre de subcategoría…" addDis={!s2id} units={units}>
              {!s2 ? <Empty label="Seleccioná un Área" cta="← anterior"/>
              : n3List.length===0 ? <Empty label="Sin subcategorías" cta="Opcional — podés agregar ítems al Área"/>
              : n3List.map(n3=>(
                  <MRow key={n3.id} id={n3.id} label={n3.nombre}
                    count={countN3(n3.nombre)} selected={s3id===n3.id}
                    color={selColor}
                    onSelect={()=>selN3(n3)}
                    onEdit={editCat} onDelete={delCat}/>
                ))
              }
            </McCol>

            {/* Col 4 — Ítems del contexto */}
            <McCol title={itemsTitle} idx={3} mobileIdx={mc}
              onAdd={s1?addItem:undefined} addPh="Nombre del ítem…" addUnit={true} addDis={!s1} units={units}>
              {!s1 ? <Empty label="Seleccioná un nivel" cta="← navegar primero"/>
              : ctxItems.length===0 ? <Empty label="Sin ítems aquí" cta="Usá ＋ para agregar"/>
              : ctxItems.map(it=>(
                  <MRow key={it.id} id={it.id} label={it.nombre} unit={it.unidad_default}
                    isItem selected={false} color={selColor} units={units}
                    subruta={!s2 ? [it.n2,it.n3].filter(Boolean).join(' › ') || undefined
                            : !s3 ? it.n3 || undefined : undefined}
                    onEdit={editItem} onDelete={delItem}/>
                ))
              }
            </McCol>
          </div>
        </>
      )}

      {/* Toast */}
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
