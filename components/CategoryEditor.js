'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { UNITS, N1_COLORS, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import { CreateItemModal } from './ItemSearch'
import {
  IconEditar, IconEliminar, IconPlus, IconCerrar,
  IconGuardar, IconCheck, IconAdvertencia, IconCaretDown, IconCaretRight,
  IconSpinner, IconEtiqueta, IconItems, IconEtiquetas,
} from '../lib/icons'

const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱','🌿','💈','🎓','🏥','💰','🔑']
const NIVEL_LABELS = { 1:'Tipo', 2:'Área', 3:'Subcategoría' }
const NIVEL_COLORS = ['#3b82f6','#059669','#7c3aed']

function buildTree(cats) {
  const map = {}
  cats.forEach(c => { map[c.id] = { ...c, children: [] } })
  const roots = []
  cats.forEach(c => {
    if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id])
    else if (!c.parent_id) roots.push(map[c.id])
  })
  return roots
}

// ── Pestaña de Ítems ──────────────────────────────────────────────────────────
function ItemsTab() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [filterN1, setFilterN1] = useState('')
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast]       = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState(null)
  const { categories } = useCategories()

  const showToast = (msg, type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/items')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const opts_n1 = useMemo(() => [...new Set(items.map(it => it.n1).filter(Boolean))].sort(), [items])

  const filtered = useMemo(() => {
    let list = items
    if (filterN1) list = list.filter(it => it.n1 === filterN1)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(it => it.nombre.toLowerCase().includes(q) || (it.n3||'').toLowerCase().includes(q))
    }
    return [...list].sort((a,b) => a.nombre.localeCompare(b.nombre))
  }, [items, query, filterN1])

  const handleDeleteConfirm = async () => {
    setDeleting(true); setDelError(null)
    try {
      const res = await fetch(`/api/items?id=${deleteItem.id}`, { method:'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      setItems(prev => prev.filter(it => it.id !== deleteItem.id))
      setDeleteItem(null)
      showToast(`"${deleteItem.nombre}" eliminado`, 'warn')
    } catch(e) { setDelError(e.message) }
    finally { setDeleting(false) }
  }

  const inp = { padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit' }

  return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:160 }}>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar ítem…"
            style={{ ...inp, width:'100%', paddingLeft:32, boxSizing:'border-box' }} />
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-muted)' }}>🔍</span>
        </div>
        {opts_n1.length > 1 && (
          <select value={filterN1} onChange={e=>setFilterN1(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
            <option value="">Todos los tipos</option>
            {opts_n1.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button onClick={() => setShowCreate(true)}
          style={{ padding:'8px 14px', border:'none', borderRadius:8, background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <IconPlus size={14} aria-hidden="true" /> Nuevo ítem
        </button>
      </div>

      {/* Stats */}
      <p style={{ fontSize:12, color:'var(--text-muted)', margin:'0 0 10px' }}>
        {loading ? 'Cargando…' : `${items.length} ítem${items.length!==1?'s':''} · mostrando ${filtered.length}`}
      </p>

      {/* Lista */}
      {loading && (
        <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
          <IconSpinner size={24} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-muted)' }}>
          {items.length === 0
            ? <><div style={{ fontSize:40, marginBottom:10 }}>📦</div><p style={{ margin:0 }}>Todavía no hay ítems guardados</p></>
            : <p style={{ margin:0 }}>Sin resultados para "<strong>{query}</strong>"</p>
          }
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ border:'1.5px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          {filtered.map((item, idx) => {
            const c = N1_COLORS[item.n1] || { bg:'#64748b', light:'#f1f5f9', text:'#64748b' }
            return (
              <div key={item.id}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom: idx < filtered.length-1 ? '1px solid var(--border)' : 'none', background:'var(--surface)' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:c.bg, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{item.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{[item.n1,item.n2,item.n3].filter(Boolean).join(' › ')}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--surface2)', color:'var(--text-secondary)', flexShrink:0 }}>
                  {item.unidad_default||'unidad'}
                </span>
                <button onClick={() => setEditItem(item)} aria-label={`Editar ${item.nombre}`}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'var(--accent)', padding:4, display:'flex', borderRadius:6 }}>
                  <IconEditar size={14} aria-hidden="true" />
                </button>
                <button onClick={() => setDeleteItem(item)} aria-label={`Eliminar ${item.nombre}`}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', padding:4, display:'flex', borderRadius:6 }}>
                  <IconEliminar size={14} aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <CreateItemModal
          onSave={(item) => { setItems(prev => [...prev, item]); setShowCreate(false); showToast(`"${item.nombre}" creado`) }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Modal editar */}
      {editItem && (
        <EditItemModal
          item={editItem}
          categories={categories}
          onSave={(updated) => { setItems(prev => prev.map(it => it.id===updated.id ? updated : it)); setEditItem(null); showToast(`"${updated.nombre}" actualizado`) }}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Modal confirmar borrar */}
      {deleteItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          role="dialog" aria-modal="true">
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, maxWidth:360, width:'100%', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <IconEliminar size={26} color="#ef4444" aria-hidden="true" />
            </div>
            <h3 style={{ margin:'0 0 8px', fontSize:16, fontWeight:800 }}>¿Eliminar ítem?</h3>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'var(--text-muted)' }}>
              Se eliminará <strong>"{deleteItem.nombre}"</strong> de tu lista.
            </p>
            {delError && <p style={{ fontSize:12, color:'#dc2626', marginBottom:12 }}>{delError}</p>}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setDeleteItem(null); setDelError(null) }} style={{ flex:1, padding:'10px', border:'1.5px solid var(--border)', borderRadius:10, background:'var(--surface2)', color:'var(--text-secondary)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting}
                style={{ flex:1, padding:'10px', border:'none', borderRadius:10, background: deleting?'var(--border)':'#ef4444', color:'#fff', fontWeight:800, fontSize:13, cursor: deleting?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {deleting ? <IconSpinner size={14} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" /> : <IconEliminar size={14} aria-hidden="true" />}
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" style={{ position:'fixed', bottom:28, right:28, zIndex:2000, background: toast.type==='warn'?'#fef3c7':'var(--surface)', border:`1.5px solid ${toast.type==='warn'?'#d97706':'#10b981'}`, color: toast.type==='warn'?'#92400e':'#065f46', borderRadius:12, padding:'12px 18px', fontSize:13, fontWeight:700, boxShadow:'0 8px 24px rgba(0,0,0,.15)', display:'flex', alignItems:'center', gap:8 }}>
          {toast.type==='warn' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Modal editar ítem (inline en CategoryEditor) ──────────────────────────────
function EditItemModal({ item, categories, onSave, onClose }) {
  const [nombre, setNombre] = useState(item.nombre||'')
  const [unidad, setUnidad] = useState(item.unidad_default||'unidad')
  const [n1, setN1] = useState(item.n1||'')
  const [n2, setN2] = useState(item.n2||'')
  const [n3, setN3] = useState(item.n3||'')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const opts_n1 = useMemo(() => uniq(categories.map(c=>c.n1)), [categories])
  const opts_n2 = useMemo(() => n1?uniq(categories.filter(c=>c.n1===n1).map(c=>c.n2)):[], [categories,n1])
  const opts_n3 = useMemo(() => n2?uniq(categories.filter(c=>c.n1===n1&&c.n2===n2).map(c=>c.n3)):[], [categories,n1,n2])
  const valid = nombre.trim().length>=2 && n1 && n2 && n3

  const handleSave = async () => {
    if (!valid||saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/items', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:item.id, nombre:nombre.trim(), n1, n2, n3, unidad_default:unidad }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Error al guardar')
      onSave(data)
    } catch(e) { setError(e.message); setSaving(false) }
  }

  useEffect(() => {
    const h = e => { if(e.key==='Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const inp = { padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'var(--surface2)', outline:'none', width:'100%', color:'var(--text-primary)', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000 }} />
      <div role="dialog" aria-modal="true" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:1001, width:'min(480px,95vw)', background:'var(--surface)', borderRadius:18, boxShadow:'0 24px 60px rgba(0,0,0,.25)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px 14px', borderBottom:'1px solid var(--border)' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
            <IconEditar size={16} weight="duotone" color="var(--accent)" aria-hidden="true" /> Editar ítem
          </h3>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
            <IconCerrar size={18} aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding:'18px 22px', flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={lbl}>Nombre *</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} autoFocus style={inp} />
          </div>
          <div>
            <label style={lbl}>Unidad por defecto</label>
            <select value={unidad} onChange={e=>setUnidad(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={{ ...lbl, marginBottom:10 }}>Categoría (3 niveles) *</label>
            {n1&&n2&&n3 && (
              <div style={{ padding:'6px 10px', background:(N1_COLORS[n1]||{}).light||'#eff6ff', borderRadius:7, marginBottom:8, fontSize:12, fontWeight:700, color:(N1_COLORS[n1]||{}).text||'#3b82f6' }}>
                {n1} › {n2} › {n3}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Tipo',         val:n1, opts:opts_n1, onChg:v=>{setN1(v);setN2('');setN3('')}, dis:false },
                { label:'Área',         val:n2, opts:opts_n2, onChg:v=>{setN2(v);setN3('')},           dis:!n1   },
                { label:'Subcategoría', val:n3, opts:opts_n3, onChg:v=>setN3(v),                       dis:!n2   },
              ].map(({label,val,opts,onChg,dis}) => (
                <div key={label}>
                  <label style={{ ...lbl, fontSize:9 }}>{label}</label>
                  <select value={val} onChange={e=>onChg(e.target.value)} disabled={dis||opts.length===0}
                    style={{ ...inp, cursor:dis?'not-allowed':'pointer', opacity:dis?0.5:1 }}>
                    <option value="">— elegí —</option>
                    {opts.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize:12, color:'#dc2626', margin:0 }}>{error}</p>}
        </div>
        <div style={{ display:'flex', gap:8, padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', border:'1.5px solid var(--border)', borderRadius:9, background:'var(--surface)', color:'var(--text-secondary)', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!valid||saving}
            style={{ flex:2, padding:'9px', border:'none', borderRadius:9, background:valid?'var(--accent)':'var(--border)', color:valid?'#fff':'var(--text-muted)', fontSize:13, fontWeight:800, cursor:valid&&!saving?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {saving?<><IconSpinner size={13} style={{animation:'spin 1s linear infinite'}} aria-hidden="true"/> Guardando…</>:<><IconGuardar size={13} aria-hidden="true"/> Guardar</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Pestaña de Categorías ─────────────────────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats]           = useState([])
  const [tree, setTree]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [expanded, setExpanded]   = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [showAddFor, setShowAddFor] = useState(null)
  const [newForm, setNewForm]     = useState({ nombre:'', icono:'📦', color:'#3b82f6' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving]       = useState(false)
  const { refetch }               = useCategories()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const res  = await fetch('/api/categorias')
    const data = await res.json()
    // solo niveles 1-3 (los ítems nivel 4 están en la pestaña Ítems)
    const filtered = data.filter(c => c.nivel <= 3)
    setCats(filtered)
    setTree(buildTree(filtered))
    setLoading(false)
  }

  const toggle = (id) => setExpanded(p=>({...p,[id]:!p[id]}))

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditForm({ nombre:cat.nombre, icono:cat.icono||'📦', color:cat.color||'#3b82f6' })
  }

  const saveEdit = async (id) => {
    setSaving(true)
    const res = await fetch('/api/categorias', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, ...editForm }) })
    if (!res.ok) { const d=await res.json(); setError(d.error||'Error'); setSaving(false); return }
    setEditingId(null); await load(); refetch(); setSaving(false)
  }

  const addChild = async (parentId, nivel) => {
    if (!newForm.nombre.trim()) return
    setSaving(true)
    const res = await fetch('/api/categorias', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ nombre:newForm.nombre, icono:newForm.icono, color:newForm.color, parent_id:parentId, nivel }) })
    if (!res.ok) { const d=await res.json(); setError(d.error||'Error al crear'); setSaving(false); return }
    setShowAddFor(null); setNewForm({ nombre:'',icono:'📦',color:'#3b82f6' }); await load(); refetch(); setSaving(false)
  }

  const deleteCat = async (id) => {
    setSaving(true)
    const res = await fetch(`/api/categorias?id=${id}`, { method:'DELETE' })
    if (!res.ok) { const d=await res.json(); setError(d.error||'No se puede eliminar'); setSaving(false); setDeleteConfirm(null); return }
    setDeleteConfirm(null); await load(); refetch(); setSaving(false)
  }

  const inp = { padding:'7px 10px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit' }

  const renderNode = (node, depth=0) => {
    const isExp     = !!expanded[node.id]
    const isEditing = editingId===node.id
    const levelColor = NIVEL_COLORS[(node.nivel-1)%3]
    const isSistema  = node.es_sistema

    return (
      <div key={node.id} style={{ marginLeft:depth*18 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', marginBottom:5, flexWrap:'wrap' }}>

          {/* Toggle expand */}
          <button onClick={()=>toggle(node.id)} aria-expanded={isExp} aria-label={isExp?'Colapsar':'Expandir'}
            style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px', flexShrink:0, display:'flex', marginTop:1 }}>
            {isExp ? <IconCaretDown size={13} aria-hidden="true" /> : <IconCaretRight size={13} aria-hidden="true" />}
          </button>

          <span style={{ fontSize:15, lineHeight:1, marginTop:1 }}>{node.icono||'📦'}</span>

          {isEditing ? (
            <div style={{ flex:1, display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
              <input value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))}
                style={{ ...inp, flex:1, minWidth:120 }} autoFocus aria-label="Nombre" />
              <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                {ICONOS.map(ic=>(
                  <button key={ic} onClick={()=>setEditForm(p=>({...p,icono:ic}))} aria-label={`Ícono ${ic}`}
                    style={{ fontSize:14, padding:2, border:`2px solid ${editForm.icono===ic?'var(--accent)':'transparent'}`, borderRadius:4, background:'none', cursor:'pointer' }}>
                    {ic}
                  </button>
                ))}
              </div>
              <input type="color" value={editForm.color||'#3b82f6'} onChange={e=>setEditForm(p=>({...p,color:e.target.value}))}
                style={{ width:30, height:30, border:'none', padding:0, borderRadius:6, cursor:'pointer' }} aria-label="Color" />
              <button onClick={()=>saveEdit(node.id)} disabled={saving}
                style={{ border:'none', background:'#10b981', color:'#fff', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                <IconCheck size={12} weight="bold" aria-hidden="true" /> Guardar
              </button>
              <button onClick={()=>setEditingId(null)}
                style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', borderRadius:7, padding:'5px 8px', cursor:'pointer', display:'flex' }}>
                <IconCerrar size={12} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                <span style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{node.nombre}</span>
                <span style={{ fontSize:10, fontWeight:700, background:levelColor+'18', color:levelColor, padding:'1px 7px', borderRadius:99 }}>
                  N{node.nivel} · {NIVEL_LABELS[node.nivel]}
                </span>
                {isSistema && (
                  <span style={{ fontSize:10, color:'#64748b', background:'#f1f5f9', padding:'1px 7px', borderRadius:99 }}>sistema</span>
                )}
              </div>

              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                {/* Editar — siempre disponible, warning si es sistema */}
                <button onClick={()=>startEdit(node)} aria-label={`Editar ${node.nombre}`}
                  style={{ border:'none', background:'none', cursor:'pointer', padding:'4px', borderRadius:6, color: isSistema ? '#d97706' : 'var(--text-muted)', display:'flex' }}
                  title={isSistema ? 'Categoría del sistema — podés editar nombre e ícono' : 'Editar'}>
                  <IconEditar size={13} aria-hidden="true" />
                </button>
                {/* Agregar hijo (solo niveles 1 y 2, máximo 3 niveles de categoría) */}
                {node.nivel < 3 && (
                  <button onClick={()=>{ setShowAddFor(node.id); setNewForm({ nombre:'', icono:'📦', color:levelColor }) }}
                    aria-label={`Agregar ${NIVEL_LABELS[node.nivel+1]}`}
                    style={{ border:'none', background:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'#10b981', display:'flex' }}>
                    <IconPlus size={13} aria-hidden="true" />
                  </button>
                )}
                {/* Eliminar — con aviso extra si es sistema */}
                <button onClick={()=>setDeleteConfirm(node)} aria-label={`Eliminar ${node.nombre}`}
                  style={{ border:'none', background:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'#ef4444', display:'flex' }}>
                  <IconEliminar size={13} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Form agregar hijo */}
        {showAddFor===node.id && (
          <div style={{ marginLeft:18, marginBottom:7, padding:'11px 13px', background:'var(--surface2)', borderRadius:10, border:'1.5px dashed var(--accent)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)' }}>+ {NIVEL_LABELS[node.nivel+1]}</span>
            <input placeholder="Nombre…" value={newForm.nombre} onChange={e=>setNewForm(p=>({...p,nombre:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&addChild(node.id,node.nivel+1)}
              style={{ ...inp, flex:1, minWidth:120 }} autoFocus aria-label="Nombre nueva categoría" />
            <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
              {ICONOS.slice(0,10).map(ic=>(
                <button key={ic} onClick={()=>setNewForm(p=>({...p,icono:ic}))} aria-label={`Ícono ${ic}`}
                  style={{ fontSize:13, padding:2, border:`2px solid ${newForm.icono===ic?'var(--accent)':'transparent'}`, borderRadius:4, background:'none', cursor:'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
            <button onClick={()=>addChild(node.id,node.nivel+1)} disabled={saving||!newForm.nombre.trim()}
              style={{ border:'none', background:'var(--accent)', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
              <IconPlus size={12} aria-hidden="true" /> Agregar
            </button>
            <button onClick={()=>setShowAddFor(null)}
              style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', borderRadius:8, padding:'6px 7px', cursor:'pointer', display:'flex' }}>
              <IconCerrar size={12} aria-hidden="true" />
            </button>
          </div>
        )}

        {isExp && node.children?.map(child=>renderNode(child,depth+1))}
      </div>
    )
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
      <IconSpinner size={26} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      {/* Error */}
      {error && (
        <div role="alert" style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}>
            <IconAdvertencia size={14} weight="fill" aria-hidden="true" /> {error}
          </span>
          <button onClick={()=>setError(null)} style={{ border:'none', background:'none', cursor:'pointer', color:'#dc2626', display:'flex' }}>
            <IconCerrar size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Aviso sistema */}
      <div style={{ padding:'9px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, marginBottom:14, fontSize:12, color:'#92400e', display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:14 }}>⚠</span>
        Las categorías del sistema (marcadas como <strong>sistema</strong>) se pueden editar o eliminar, pero ten cuidado: afecta a todos tus gastos ya registrados con esa categoría.
      </div>

      {/* Modal eliminar */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} role="dialog" aria-modal="true">
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, maxWidth:360, width:'100%', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background: deleteConfirm.es_sistema?'#fef3c7':'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <IconEliminar size={26} color={deleteConfirm.es_sistema?'#d97706':'#ef4444'} aria-hidden="true" />
            </div>
            <h4 style={{ margin:'0 0 8px', fontSize:16, fontWeight:800 }}>¿Eliminar categoría?</h4>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>
              <strong>"{deleteConfirm.nombre}"</strong>
            </p>
            {deleteConfirm.es_sistema && (
              <p style={{ fontSize:12, color:'#d97706', background:'#fffbeb', borderRadius:8, padding:'8px 10px', marginBottom:12 }}>
                ⚠ Es una categoría del sistema. Eliminarla puede afectar gastos ya registrados.
              </p>
            )}
            <p style={{ fontSize:12, color:'#ef4444', marginBottom:20 }}>Los hijos también serán eliminados.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ padding:'8px 18px', borderRadius:9, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={()=>deleteCat(deleteConfirm.id)} disabled={saving}
                style={{ padding:'8px 20px', borderRadius:9, border:'none', background: deleteConfirm.es_sistema?'#d97706':'#ef4444', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                {deleteConfirm.es_sistema ? 'Eliminar igualmente' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
        <IconEtiqueta size={12} aria-hidden="true" />
        {cats.filter(c=>!c.es_sistema).length} propias · {cats.filter(c=>c.es_sistema).length} del sistema
      </div>

      {/* Agregar tipo raíz */}
      {showAddFor==='root' ? (
        <div style={{ marginBottom:12, padding:'11px 13px', background:'var(--surface2)', borderRadius:10, border:'1.5px dashed var(--accent)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)' }}>+ Nuevo tipo</span>
          <input placeholder="Nombre…" value={newForm.nombre} onChange={e=>setNewForm(p=>({...p,nombre:e.target.value}))}
            onKeyDown={e=>e.key==='Enter'&&addChild(null,1)}
            style={{ ...inp, flex:1 }} autoFocus aria-label="Nombre nuevo tipo" />
          <button onClick={()=>addChild(null,1)} disabled={saving||!newForm.nombre.trim()}
            style={{ border:'none', background:'var(--accent)', color:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
            <IconPlus size={12} aria-hidden="true" /> Agregar
          </button>
          <button onClick={()=>setShowAddFor(null)}
            style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', borderRadius:8, padding:'7px 8px', cursor:'pointer', display:'flex' }}>
            <IconCerrar size={12} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button onClick={()=>setShowAddFor('root')}
          style={{ padding:'7px 14px', borderRadius:9, border:'1.5px dashed var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:700, fontSize:12, cursor:'pointer', marginBottom:12, display:'flex', alignItems:'center', gap:5 }}>
          <IconPlus size={13} aria-hidden="true" /> Agregar tipo raíz
        </button>
      )}

      {/* Árbol */}
      <div>
        {tree.length===0 && (
          <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)' }}>Sin categorías.</div>
        )}
        {tree.map(node=>renderNode(node,0))}
      </div>
    </div>
  )
}

// ── Componente principal con pestañas ─────────────────────────────────────────
export default function CategoryEditor() {
  const [tab, setTab] = useState('categorias')

  const TABS = [
    { id:'categorias', label:'Categorías', Icon: IconEtiquetas },
    { id:'items',      label:'Ítems',      Icon: IconItems     },
  ]

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--border)', marginBottom:20 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} aria-selected={tab===id}
            style={{
              padding:'10px 20px', border:'none', borderBottom:`2px solid ${tab===id?'var(--accent)':'transparent'}`,
              marginBottom:-2, background:'transparent', cursor:'pointer',
              color: tab===id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: tab===id ? 800 : 600, fontSize:13,
              display:'flex', alignItems:'center', gap:6, transition:'all .15s',
            }}>
            <Icon size={15} weight={tab===id?'fill':'regular'} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'categorias' && <CategoriesTab />}
      {tab === 'items'      && <ItemsTab />}
    </div>
  )
}
