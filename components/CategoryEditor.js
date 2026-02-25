'use client'
import { useState, useEffect } from 'react'
import {
  IconEditar, IconEliminar, IconPlus, IconCerrar,
  IconGuardar, IconCheck, IconAdvertencia, IconCaretDown, IconCaretRight,
  IconSpinner, IconEtiqueta,
} from '../lib/icons'

// Emojis: se mantienen como datos de categoría (son parte del contenido, no UI de navegación)
const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱','🌿','💈','🎓','🏥','💰','🔑']
const NIVEL_LABELS = { 1:'Tipo', 2:'Área', 3:'Subcategoría', 4:'Ítem' }

function buildTree(cats, parentId=null, nivel=1) {
  return cats.filter(c=>c.parent_id===parentId&&c.nivel===nivel)
    .map(c=>({ ...c, children:buildTree(cats,c.id,nivel+1) }))
}

export default function CategoryEditor() {
  const [cats, setCats]         = useState([])
  const [tree, setTree]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [expanded, setExpanded] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddFor, setShowAddFor] = useState(null)
  const [newForm, setNewForm]   = useState({ nombre:'', icono:'📦', color:'#3b82f6' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/categorias')
    const data = await res.json()
    setCats(data)
    setTree(buildTree(data))
    setLoading(false)
  }

  const toggle = (id) => setExpanded(p=>({ ...p,[id]:!p[id] }))
  const startEdit = (cat) => { setEditingId(cat.id); setEditForm({ nombre:cat.nombre, icono:cat.icono, color:cat.color }) }

  const saveEdit = async (id) => {
    setSaving(true)
    const res = await fetch('/api/categorias', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id,...editForm }) })
    if (!res.ok) { const d=await res.json(); setError(d.error||'Error al guardar'); setSaving(false); return }
    setEditingId(null); await load(); setSaving(false)
  }

  const addChild = async (parentId, nivel) => {
    if (!newForm.nombre.trim()) return
    setSaving(true)
    const res = await fetch('/api/categorias', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ nombre:newForm.nombre, icono:newForm.icono, color:newForm.color, parent_id:parentId, nivel }) })
    if (!res.ok) { const d=await res.json(); setError(d.error||'Error al crear'); setSaving(false); return }
    setShowAddFor(null); setNewForm({ nombre:'',icono:'📦',color:'#3b82f6' }); await load(); setSaving(false)
  }

  const deleteCat = async (id) => {
    setSaving(true)
    const res = await fetch(`/api/categorias?id=${id}`, { method:'DELETE' })
    if (!res.ok) { const d=await res.json(); setError(d.error||'No se puede eliminar'); setSaving(false); setDeleteConfirm(null); return }
    setDeleteConfirm(null); await load(); setSaving(false)
  }

  const inpStyle = { padding:'7px 10px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit' }

  const renderNode = (node, depth=0) => {
    const isExp     = !!expanded[node.id]
    const isEditing = editingId===node.id
    const hasChildren = node.children?.length>0 || node.nivel<4
    const levelColors = ['#3b82f6','#059669','#7c3aed','#db2777']
    const levelColor  = levelColors[(node.nivel-1)%4]

    return (
      <div key={node.id} style={{ marginLeft:depth*20 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', marginBottom:6, flexWrap:'wrap' }}>

          {/* Expand toggle */}
          <button onClick={()=>toggle(node.id)} aria-expanded={isExp} aria-label={isExp?'Colapsar':'Expandir'}
            style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px', flexShrink:0, display:'flex' }}>
            {isExp ? <IconCaretDown size={14} aria-hidden="true" /> : <IconCaretRight size={14} aria-hidden="true" />}
          </button>

          {/* Ícono + nombre */}
          <span style={{ fontSize:16, lineHeight:1 }}>{node.icono}</span>

          {isEditing ? (
            <div style={{ flex:1, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <input value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))} style={{ ...inpStyle, flex:1, minWidth:120 }} aria-label="Nombre de categoría" />
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {ICONOS.map(ic=>(
                  <button key={ic} onClick={()=>setEditForm(p=>({...p,icono:ic}))} aria-label={`Ícono ${ic}`}
                    style={{ fontSize:15, padding:2, border:`2px solid ${editForm.icono===ic?'var(--accent)':'transparent'}`, borderRadius:4, background:'none', cursor:'pointer' }}>
                    {ic}
                  </button>
                ))}
              </div>
              <input type="color" value={editForm.color} onChange={e=>setEditForm(p=>({...p,color:e.target.value}))} style={{ width:32, height:32, border:'none', padding:0, borderRadius:6, cursor:'pointer' }} aria-label="Color" />
              <button onClick={()=>saveEdit(node.id)} disabled={saving} aria-label="Guardar cambios"
                style={{ border:'none', background:'#10b981', color:'#fff', borderRadius:7, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontWeight:700, fontSize:12 }}>
                <IconCheck size={13} weight="bold" aria-hidden="true" /> Guardar
              </button>
              <button onClick={()=>setEditingId(null)} aria-label="Cancelar edición"
                style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', borderRadius:7, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <IconCerrar size={13} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{node.nombre}</span>
                <span style={{ marginLeft:8, fontSize:10, color:'var(--text-muted)', fontWeight:600, background:levelColor+'18', color:levelColor, padding:'1px 7px', borderRadius:99 }}>
                  N{node.nivel} · {NIVEL_LABELS[node.nivel]}
                </span>
                {node.es_sistema && (
                  <span style={{ marginLeft:6, fontSize:10, color:'#64748b', background:'#f1f5f9', padding:'1px 7px', borderRadius:99 }}>sistema</span>
                )}
              </div>

              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                {!node.es_sistema && (
                  <button onClick={()=>startEdit(node)} aria-label={`Editar ${node.nombre}`}
                    style={{ border:'none', background:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'var(--text-muted)', display:'flex' }}>
                    <IconEditar size={13} aria-hidden="true" />
                  </button>
                )}
                {node.nivel < 4 && (
                  <button onClick={()=>{ setShowAddFor(node.id); setNewForm({ nombre:'', icono:'📦', color:levelColor }) }}
                    aria-label={`Agregar ${NIVEL_LABELS[node.nivel+1]}`}
                    style={{ border:'none', background:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'#10b981', display:'flex' }}>
                    <IconPlus size={13} aria-hidden="true" />
                  </button>
                )}
                {!node.es_sistema && (
                  <button onClick={()=>setDeleteConfirm(node)} aria-label={`Eliminar ${node.nombre}`}
                    style={{ border:'none', background:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'#ef4444', display:'flex' }}>
                    <IconEliminar size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Form agregar hijo */}
        {showAddFor===node.id && (
          <div style={{ marginLeft:20, marginBottom:8, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, border:'1.5px dashed var(--accent)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)' }}>+ {NIVEL_LABELS[node.nivel+1]}</span>
            <input placeholder="Nombre…" value={newForm.nombre} onChange={e=>setNewForm(p=>({...p,nombre:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&addChild(node.id,node.nivel+1)}
              style={{ ...inpStyle, flex:1, minWidth:120 }} aria-label="Nombre de nueva categoría" autoFocus />
            <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
              {ICONOS.slice(0,12).map(ic=>(
                <button key={ic} onClick={()=>setNewForm(p=>({...p,icono:ic}))} aria-label={`Ícono ${ic}`}
                  style={{ fontSize:14, padding:2, border:`2px solid ${newForm.icono===ic?'var(--accent)':'transparent'}`, borderRadius:4, background:'none', cursor:'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
            <button onClick={()=>addChild(node.id,node.nivel+1)} disabled={saving||!newForm.nombre.trim()}
              style={{ border:'none', background:'var(--accent)', color:'#fff', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
              <IconPlus size={13} aria-hidden="true" /> Agregar
            </button>
            <button onClick={()=>setShowAddFor(null)} aria-label="Cancelar"
              style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', borderRadius:8, padding:'6px 8px', cursor:'pointer', display:'flex' }}>
              <IconCerrar size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Hijos */}
        {isExp && node.children?.map(child=>renderNode(child,depth+1))}
      </div>
    )
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <IconSpinner size={28} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" />
      <span>Cargando categorías…</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      {/* Error */}
      {error && (
        <div role="alert" style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}>
            <IconAdvertencia size={15} weight="fill" aria-hidden="true" /> {error}
          </span>
          <button onClick={()=>setError(null)} aria-label="Cerrar error" style={{ border:'none', background:'none', cursor:'pointer', color:'#dc2626', display:'flex' }}>
            <IconCerrar size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Modal eliminar */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} role="dialog" aria-modal="true" aria-labelledby="del-cat-title">
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, maxWidth:340, width:'90%', textAlign:'center' }}>
            <IconEliminar size={40} weight="duotone" color="#ef4444" style={{ marginBottom:10 }} aria-hidden="true" />
            <h4 id="del-cat-title" style={{ margin:'0 0 8px', color:'var(--text-primary)' }}>¿Eliminar categoría?</h4>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:6 }}>
              <strong>{deleteConfirm.nombre}</strong> — se eliminará permanentemente.
            </p>
            <p style={{ fontSize:12, color:'#f59e0b', marginBottom:20 }}>Los hijos también serán eliminados.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ padding:'8px 18px', borderRadius:9, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={()=>deleteCat(deleteConfirm.id)} disabled={saving} style={{ padding:'8px 20px', borderRadius:9, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
        <IconEtiqueta size={13} aria-hidden="true" />
        {cats.filter(c=>!c.es_sistema).length} categorías propias · {cats.filter(c=>c.es_sistema).length} del sistema
      </div>

      {/* Agregar tipo raíz */}
      {showAddFor==='root' ? (
        <div style={{ marginBottom:12, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, border:'1.5px dashed var(--accent)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)' }}>+ Nuevo tipo</span>
          <input placeholder="Nuevo tipo…" value={newForm.nombre} onChange={e=>setNewForm(p=>({...p,nombre:e.target.value}))}
            onKeyDown={e=>e.key==='Enter'&&addChild(null,1)}
            style={{ ...inpStyle, flex:1 }} aria-label="Nombre del nuevo tipo" autoFocus />
          <button onClick={()=>addChild(null,1)} disabled={saving||!newForm.nombre.trim()}
            style={{ border:'none', background:'var(--accent)', color:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
            <IconPlus size={13} aria-hidden="true" /> Agregar
          </button>
          <button onClick={()=>setShowAddFor(null)} aria-label="Cancelar"
            style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', borderRadius:8, padding:'7px 8px', cursor:'pointer', display:'flex' }}>
            <IconCerrar size={13} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button onClick={()=>setShowAddFor('root')}
          style={{ padding:'8px 16px', borderRadius:9, border:'1.5px dashed var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:700, fontSize:12, cursor:'pointer', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
          <IconPlus size={14} aria-hidden="true" /> Agregar tipo principal
        </button>
      )}

      {/* Árbol */}
      <div>
        {tree.length===0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)' }}>Sin categorías. Ejecutá la migración SQL primero.</div>}
        {tree.map(node=>renderNode(node,0))}
      </div>
    </div>
  )
}
