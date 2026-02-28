'use client'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { N1_COLORS } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import {
  IconPlus, IconEditar, IconEliminar, IconCaretRight,
  IconSpinner, IconCerrar, IconCheck, IconBuscar,
} from '../lib/icons'

const COL_LABELS = ['Tipo (N1)', 'Área (N2)', 'Subcategoría (N3)', 'Ítems']
const ICONOS = [
  '📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡',
  '🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱',
  '🌿','🎓','🏥','💰','🔑','🍕','🎵','🏖️',
]

// ── Build tree from flat view ─────────────────────────────────────────────────
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

// ── Inline add row at bottom of each column ───────────────────────────────────
function AddRow({ placeholder, withIcon, onAdd, disabled }) {
  const [open, setOpen]   = useState(false)
  const [val,  setVal]    = useState('')
  const [ico,  setIco]    = useState('📦')
  const [busy, setBusy]   = useState(false)
  const inp = useRef(null)
  const open_ = () => { if (!disabled) { setOpen(true); setTimeout(() => inp.current?.focus(), 40) } }
  const close = () => { setOpen(false); setVal('') }
  const submit = async () => {
    if (!val.trim() || busy) return
    setBusy(true); await onAdd(val.trim(), ico); setBusy(false); close()
  }
  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px', flexShrink: 0, background: 'var(--surface2)' }}>
      {!open ? (
        <button onClick={open_} disabled={disabled}
          style={{ width:'100%', padding:'5px 10px', border:'1.5px dashed var(--border)', borderRadius:8, background:'transparent', color: disabled?'var(--text-muted)':'var(--accent)', fontFamily:'inherit', fontSize:12, fontWeight:600, cursor: disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:5, opacity: disabled?.4:1 }}>
          <IconPlus size={11} aria-hidden="true" />Agregar…
        </button>
      ) : (
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
      )}
    </div>
  )
}

// ── Single row (category or item) ─────────────────────────────────────────────
function MRow({ id, label, icon, unit, count, selected, color, onSelect, onEdit, onDelete, isItem }) {
  const [editing, setEditing] = useState(false)
  const [ev, setEv]           = useState(label)
  const [ds, setDs]           = useState(null) // null | 'confirm' | 'err:msg'
  const [busy, setBusy]       = useState(false)
  const inp = useRef(null)
  useEffect(() => { if(editing) setTimeout(()=>inp.current?.focus(),40) }, [editing])

  const saveEdit = async () => {
    if(!ev.trim()||ev===label||busy) return
    setBusy(true); const ok = await onEdit(id,ev.trim()); setBusy(false)
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
      cursor:'pointer', borderRadius:8, margin:'1px 4px', position:'relative',
      background: selected ? (c.light||'var(--accent-light,#eff6ff)') : 'transparent',
      border: `1.5px solid ${selected?(c.bg||'var(--accent)'):'transparent'}`,
      transition:'background .1s',
    }}>
      {icon
        ? <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
        : <span style={{ width:7, height:7, borderRadius:'50%', background:c.bg, flexShrink:0 }} />}

      {editing ? (
        <div style={{ flex:1, display:'flex', gap:4, minWidth:0 }} onClick={e=>e.stopPropagation()}>
          <input ref={inp} value={ev} onChange={e=>setEv(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape'){setEditing(false);setEv(label)} }}
            style={{ flex:1, padding:'3px 7px', border:'1.5px solid var(--accent)', borderRadius:5, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:13, outline:'none', minWidth:0 }} />
          <button onClick={saveEdit} disabled={busy} style={{ width:22, height:22, border:'none', borderRadius:4, background:'var(--accent)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {busy ? <IconSpinner size={10} style={{ animation:'spin .8s linear infinite' }} /> : <IconCheck size={10} />}
          </button>
          <button onClick={()=>{setEditing(false);setEv(label)}} style={{ width:22, height:22, border:'none', borderRadius:4, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <IconCerrar size={10} />
          </button>
        </div>
      ) : (
        <>
          <span style={{ flex:1, fontSize:13, fontWeight:selected?700:500, color: selected?(c.text||c.bg):'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {label}
            {unit && <span style={{ marginLeft:5, fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>{unit}</span>}
          </span>
          {count>0 && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', flexShrink:0 }}>{count}</span>}
          {!isItem && <IconCaretRight size={10} color="var(--text-muted)" style={{ flexShrink:0 }} aria-hidden="true" />}
          {/* Hover actions */}
          <div className="mrow-actions" style={{ display:'none', gap:2, position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background: selected?(c.light||'var(--surface2)'):'var(--surface)', padding:'0 2px', borderRadius:5 }}>
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

// ── Column shell ──────────────────────────────────────────────────────────────
function McCol({ title, dot, idx, mobileIdx, children, onAdd, addPh, addIcon, addDis }) {
  return (
    <div className={`mc-col ${mobileIdx===idx?'mc-active':''}`}
      style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)', minHeight:0 }}>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
        {dot && <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />}
        <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)' }}>{title}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>{children}</div>
      {onAdd && <AddRow placeholder={addPh} withIcon={addIcon} onAdd={onAdd} disabled={addDis} />}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
const Empty = ({label, cta}) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 14px', gap:6, color:'var(--text-muted)', textAlign:'center' }}>
    <span style={{ fontSize:24, opacity:.3 }}>📭</span>
    <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>
    {cta && <span style={{ fontSize:11, opacity:.6 }}>{cta}</span>}
  </div>
)

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState(null)
  const tmr = useRef(null)
  const show = useCallback((msg, type='ok') => {
    clearTimeout(tmr.current); setT({msg,type})
    tmr.current = setTimeout(()=>setT(null), 2800)
  }, [])
  return { toast: t, show }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CatalogManager() {
  const { categories, loading, refetch } = useCategories()
  const [s1, setS1] = useState(null)
  const [s2, setS2] = useState(null)
  const [s3, setS3] = useState(null)
  const [q,  setQ]  = useState('')
  const [mc, setMc] = useState(0)  // mobile active col
  const { toast, show: toast_ } = useToast()

  const tree = useMemo(() => buildTree(categories), [categories])

  const n1List = useMemo(() => {
    const list = tree.n1List
    if (!q) return list
    return list.filter(n => n.nombre.toLowerCase().includes(q.toLowerCase()))
  }, [tree, q])

  const n2List = useMemo(() => s1 ? tree.n2Of(s1) : [], [tree, s1])
  const n3List = useMemo(() => s2 ? tree.n3Of(s2) : [], [tree, s2])

  const ctxItems = useMemo(() => {
    const seen = new Set()
    return categories
      .filter(r => {
        if (s3) return r.n3_id === s3
        if (s2) return r.n2_id === s2 && !r.n3_id
        if (s1) return r.n1_id === s1 && !r.n2_id
        return false
      })
      .filter(r => r.n4_id && !seen.has(r.n4_id) && seen.add(r.n4_id))
      .map(r => ({ id: r.n4_id, nombre: r.n4, unidad: r.unidad }))
  }, [categories, s1, s2, s3])

  const countN1 = id => categories.filter(r=>r.n1_id===id&&r.n4_id).length
  const countN2 = id => categories.filter(r=>r.n2_id===id&&r.n4_id).length
  const countN3 = id => categories.filter(r=>r.n3_id===id&&r.n4_id).length

  const n1Color = name => N1_COLORS[name] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
  const selColor = useMemo(() => {
    if (!s1) return null
    const name = tree.n1List.find(n => n.id === s1)?.nombre || ''
    return n1Color(name)
  }, [s1, tree])

  // API
  const post  = async body => { const r=await fetch('/api/categorias',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const put   = async (id,nombre) => { const r=await fetch('/api/categorias',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const del   = async id => { const r=await fetch(`/api/categorias?id=${id}`,{method:'DELETE'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const ipost = async body => { const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const iput  = async (id,nombre) => { const r=await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nombre})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }
  const idel  = async id => { const r=await fetch(`/api/items?id=${id}`,{method:'DELETE'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d }

  const addN1 = useCallback(async (nombre,icono) => {
    try { await post({nombre,icono,nivel:1,parent_id:null}); refetch(); toast_(`✓ Tipo "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [refetch])
  const addN2 = useCallback(async (nombre,icono) => {
    if(!s1) return
    try { await post({nombre,icono,nivel:2,parent_id:s1}); refetch(); toast_(`✓ Área "${nombre}" creada`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s1, refetch])
  const addN3 = useCallback(async (nombre) => {
    if(!s2) return
    try { await post({nombre,nivel:3,parent_id:s2}); refetch(); toast_(`✓ Subcategoría "${nombre}" creada`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s2, refetch])
  const addItem = useCallback(async (nombre) => {
    if(!s1) return
    const n1 = tree.n1List.find(n=>n.id===s1)?.nombre || null
    const n2 = s2 ? tree.n2Of(s1).find(n=>n.id===s2)?.nombre : null
    const n3 = s3 ? tree.n3Of(s2||'').find(n=>n.id===s3)?.nombre : null
    try { await ipost({nombre,unidad_default:'unidad',n1,n2,n3}); refetch(); toast_(`✓ Ítem "${nombre}" creado`) } catch(e) { toast_('⚠ '+e.message,'err') }
  }, [s1,s2,s3,tree,refetch])

  const editCat = useCallback(async (id,nombre) => {
    try { await put(id,nombre); refetch(); toast_('✓ Renombrado'); return true } catch(e) { toast_('⚠ '+e.message,'err'); return false }
  }, [refetch])
  const delCat = useCallback(async (id,label) => {
    try { await del(id); refetch(); toast_(`✓ "${label}" eliminado`); return true } catch(e) { toast_('⚠ '+e.message,'err'); return e.message }
  }, [refetch])
  const editItem = useCallback(async (id,nombre) => {
    try { await iput(id,nombre); refetch(); toast_('✓ Ítem renombrado'); return true } catch(e) { toast_('⚠ '+e.message,'err'); return false }
  }, [refetch])
  const delItem = useCallback(async (id,label) => {
    try { await idel(id); refetch(); toast_(`✓ "${label}" eliminado`); return true } catch(e) { toast_('⚠ '+e.message,'err'); return e.message }
  }, [refetch])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, gap:8, color:'var(--text-muted)' }}>
      <IconSpinner size={18} style={{ animation:'spin .8s linear infinite' }} aria-hidden="true" />
      <span style={{ fontSize:13 }}>Cargando catálogo…</span>
    </div>
  )

  const n1node = s1 ? tree.n1List.find(n=>n.id===s1) : null
  const n2node = s2 ? tree.n2Of(s1).find(n=>n.id===s2) : null
  const n3node = s3 ? tree.n3Of(s2||'').find(n=>n.id===s3) : null

  return (
    <div>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes popUp{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .mrow:hover { background: var(--surface2) !important; }
        .mrow:hover .mrow-actions { display:flex !important; }

        /* Desktop: 4 equal cols */
        .mc-grid { display:grid; grid-template-columns:repeat(4,1fr); }
        .mc-col { display:flex; }

        /* Mobile: pill nav + 1 col at a time */
        @media (max-width:680px) {
          .mc-grid { display:block; }
          .mc-col { display:none; }
          .mc-active { display:flex; }
          .mc-mobile-nav { display:flex !important; }
        }
        .mc-mobile-nav { display:none; gap:4px; flex-wrap:wrap; }
      `}</style>

      {/* ── Top bar: search + mobile nav ─────────────────────────────────── */}
      <div style={{ padding:'9px 10px', borderBottom:'1px solid var(--border)', background:'var(--surface2)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 160px' }}>
          <IconBuscar size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} aria-hidden="true" />
          <input value={q} onChange={e=>{setQ(e.target.value);if(e.target.value){setS1(null);setS2(null);setS3(null)}}}
            placeholder="Buscar tipo, área o subcategoría…"
            style={{ width:'100%', padding:'6px 28px', border:'1.5px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12, outline:'none', boxSizing:'border-box' }} />
          {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}><IconCerrar size={11} /></button>}
        </div>
        {/* Mobile nav pills */}
        <div className="mc-mobile-nav" aria-label="Columna activa">
          {['Tipo','Área','Subcateg.','Ítems'].map((l,i)=>(
            <button key={i} onClick={()=>setMc(i)}
              style={{ padding:'5px 10px', border:`1.5px solid ${mc===i?'var(--accent)':'var(--border)'}`, borderRadius:99, background: mc===i?'var(--accent)':'transparent', color: mc===i?'#fff':'var(--text-muted)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
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

      {/* ── Miller grid ────────────────────────────────────────────────────── */}
      <div className="mc-grid" style={{ border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden', background:'var(--surface)', minHeight:360, maxHeight:500 }}>

        {/* Col 1 — N1 */}
        <McCol title={COL_LABELS[0]} idx={0} mobileIdx={mc}
          onAdd={addN1} addPh="Nombre del tipo…" addIcon addDis={false}>
          {n1List.length===0
            ? <Empty label={q?`Sin resultados`:'Sin tipos todavía'} cta="Usá ＋ para agregar" />
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
          onAdd={s1?addN2:undefined} addPh="Nombre del área…" addIcon addDis={!s1}>
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
          onAdd={s2?addN3:undefined} addPh="Nombre de subcategoría…" addDis={!s2}>
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

        {/* Col 4 — Items */}
        <McCol title={COL_LABELS[3]} idx={3} mobileIdx={mc}
          onAdd={s1?addItem:undefined} addPh="Nombre del ítem…" addDis={!s1}>
          {!s1 ? <Empty label="Seleccioná un nivel" cta="← navegar primero" />
          : ctxItems.length===0 ? <Empty label="Sin ítems aquí" cta="Usá ＋ para agregar" />
          : ctxItems.map(it=>(
              <MRow key={it.id} id={it.id} label={it.nombre} unit={it.unidad}
                isItem selected={false} color={selColor}
                onEdit={editItem} onDelete={delItem} />
            ))
          }
        </McCol>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
          background: toast.type==='err'?'#fee2e2':'var(--surface)',
          color: toast.type==='err'?'#dc2626':'var(--text-primary)',
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
