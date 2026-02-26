'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { N1_COLORS, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import { useUnits } from '../lib/useUnits'
import {
  IconPlus, IconEditar, IconEliminar, IconCaretDown, IconCaretRight,
  IconSpinner, IconGuardar, IconCerrar, IconCheck, IconAdvertencia,
  IconEtiqueta, IconItems, IconEtiquetas,
} from '../lib/icons'

const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱','🌿','💈','🎓','🏥','💰','🔑']
const NIVEL_LABEL = { 0:'Tipo', 1:'Área', 2:'Subcategoría' }

// ── Modal nueva categoría (inline) ────────────────────────────────────────────
function NewCatModal({ parentId, parentLevel, parentNombre, onSave, onClose }) {
  const [nombre, setNombre] = useState('')
  const [icono,  setIcono]  = useState('📦')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const nivelLabel = NIVEL_LABEL[parentLevel] || 'Nodo'

  const handleSave = async () => {
    if (!nombre.trim() || saving) return
    setSaving(true); setError('')
    const res = await fetch('/api/categorias', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nombre:nombre.trim(), parent_id:parentId||null, icono, nivel:parentLevel+1 }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error||'Error'); setSaving(false); return }
    onSave(data)
  }

  useEffect(() => {
    const h = e => { if (e.key==='Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const inp = { padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--surface2)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:900 }} aria-hidden="true" />
      <div role="dialog" aria-modal="true" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:901, width:'min(420px,95vw)', background:'var(--surface)', borderRadius:16, boxShadow:'0 24px 60px rgba(0,0,0,.2)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:800 }}>Nueva {nivelLabel}</h3>
            {parentNombre && <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--text-muted)' }}>bajo "{parentNombre}"</p>}
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}>
            <IconCerrar size={16} aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase' }}>Nombre *</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} autoFocus
              onKeyDown={e=>e.key==='Enter'&&handleSave()} style={inp}
              placeholder={`Nombre del ${nivelLabel.toLowerCase()}…`} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase' }}>Ícono</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {ICONOS.map(ic => (
                <button key={ic} onClick={()=>setIcono(ic)}
                  style={{ width:32, height:32, borderRadius:7, border:`2px solid ${icono===ic?'var(--accent)':'var(--border)'}`, background:icono===ic?'var(--accent-light)':'var(--surface2)', fontSize:15, cursor:'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize:12, color:'#ef4444', margin:0 }}>{error}</p>}
        </div>
        <div style={{ display:'flex', gap:8, padding:'12px 20px', borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
          <button onClick={onClose} style={{ flex:1, padding:'8px', border:'1.5px solid var(--border)', borderRadius:8, background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!nombre.trim()||saving}
            style={{ flex:2, padding:'8px', border:'none', borderRadius:8, background:nombre.trim()?'var(--accent)':'var(--border)', color:nombre.trim()?'#fff':'var(--text-muted)', fontWeight:800, fontSize:13, cursor:nombre.trim()?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            {saving ? <IconSpinner size={12} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" /> : <IconPlus size={12} aria-hidden="true" />}
            Crear {nivelLabel}
          </button>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )
}

// ── Fila de ítem (edición inline) ────────────────────────────────────────────
function ItemRow({ item, indent, onUpdate, onDelete }) {
  const { units } = useUnits()
  const [editing,    setEditing]    = useState(false)
  const [nombre,     setNombre]     = useState(item.nombre)
  const [unidad,     setUnidad]     = useState(item.unidad_default||'unidad')
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const save = async () => {
    if (!nombre.trim()||saving) return
    setSaving(true)
    const res  = await fetch('/api/items', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:item.id, nombre:nombre.trim(), unidad_default:unidad }) })
    const data = await res.json()
    if (res.ok) { onUpdate(data); setEditing(false) }
    setSaving(false)
  }

  const del = async () => {
    setSaving(true)
    const res = await fetch(`/api/items?id=${item.id}`, { method:'DELETE' })
    if (res.ok) onDelete(item.id)
    else setSaving(false)
  }

  const ei = { padding:'4px 8px', border:'1.5px solid var(--accent)', borderRadius:6, fontSize:12, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit' }

  return (
    <div className="item-row"
      style={{ display:'flex', alignItems:'center', gap:7, padding:`5px 10px 5px ${indent}px`, borderBottom:'1px solid var(--border)', background: editing ? '#f0fdf4' : 'var(--surface)', transition:'background .1s' }}>
      <IconEtiqueta size={11} color="#10b981" style={{ flexShrink:0 }} aria-hidden="true" />
      {editing ? (
        <>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} style={{ ...ei, flex:1, minWidth:60 }}
            autoFocus onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape') { setEditing(false); setNombre(item.nombre) }}} />
          <select value={unidad} onChange={e=>setUnidad(e.target.value)} style={{ ...ei, cursor:'pointer' }}>
            {units.map(u=><option key={u}>{u}</option>)}
          </select>
          <button onClick={save} disabled={saving} style={{ border:'none', background:'none', cursor:'pointer', color:'#10b981', padding:3, display:'flex' }}>
            {saving ? <IconSpinner size={11} style={{ animation:'spin 1s linear infinite' }} /> : <IconCheck size={11} />}
          </button>
          <button onClick={()=>{ setEditing(false); setNombre(item.nombre) }} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:3, display:'flex' }}>
            <IconCerrar size={11} />
          </button>
        </>
      ) : (
        <>
          <span style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{item.nombre}</span>
          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'var(--surface2)', color:'var(--text-muted)', fontWeight:600 }}>{item.unidad_default||'unidad'}</span>
          <span className="row-actions" style={{ display:'flex', gap:2, opacity:0, transition:'opacity .1s' }}>
            <button onClick={()=>setEditing(true)} title="Editar" style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:3, display:'flex', borderRadius:4 }}>
              <IconEditar size={11} />
            </button>
            {confirmDel ? (
              <span style={{ display:'flex', gap:3, alignItems:'center' }}>
                <span style={{ fontSize:10, color:'#ef4444' }}>¿Eliminar?</span>
                <button onClick={del} style={{ border:'none', background:'#ef4444', color:'#fff', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700, cursor:'pointer' }}>Sí</button>
                <button onClick={()=>setConfirmDel(false)} style={{ border:'none', background:'var(--border)', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700, cursor:'pointer' }}>No</button>
              </span>
            ) : (
              <button onClick={()=>setConfirmDel(true)} title="Eliminar" style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', padding:3, display:'flex', borderRadius:4 }}>
                <IconEliminar size={11} />
              </button>
            )}
          </span>
        </>
      )}
    </div>
  )
}

// ── Nodo de categoría (recursivo) ─────────────────────────────────────────────
// Recibe items del nivel correspondiente (n1, n2 o n3 = this node's name)
function CatNode({ node, level, allItems, onCatCreated, onCatEdited, onCatDeleted, onItemAdded, onItemUpdated, onItemDeleted }) {
  const { units }     = useUnits()
  const [open,        setOpen]        = useState(level <= 1)
  const [showAddCat,  setShowAddCat]  = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editMode,    setEditMode]    = useState(false)
  const [editNombre,  setEditNombre]  = useState(node.nombre)
  const [saving,      setSaving]      = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [newNombre,   setNewNombre]   = useState('')
  const [newUnidad,   setNewUnidad]   = useState('unidad')
  const [addingSub,   setAddingSub]   = useState(false)

  // Ítems que pertenecen DIRECTAMENTE a este nodo (sin sub-nivel)
  const myItems = useMemo(() => {
    return allItems.filter(it => {
      if (level === 1) return it.n1 === node.nombre && !it.n2
      if (level === 2) return it.n2 === node.nombre && !it.n3
      if (level === 3) return it.n3 === node.nombre
      return false
    })
  }, [allItems, node.nombre, level])

  const indent = level * 20

  const c = level === 1
    ? (N1_COLORS[node.nombre] || { bg:'#3b82f6', light:'#eff6ff', text:'#3b82f6' })
    : { bg:['#059669','#7c3aed'][level-2]||'#64748b', light:'var(--surface2)', text:['#059669','#7c3aed'][level-2]||'#64748b' }

  const saveEdit = async () => {
    if (!editNombre.trim()||saving) return
    setSaving(true)
    const res = await fetch('/api/categorias', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:node.id, nombre:editNombre.trim() }) })
    if (res.ok) { onCatEdited({ ...node, nombre:editNombre.trim() }); setEditMode(false) }
    setSaving(false)
  }

  const deleteCat = async () => {
    setSaving(true)
    const res = await fetch(`/api/categorias?id=${node.id}`, { method:'DELETE' })
    if (res.ok) onCatDeleted(node.id)
    else setSaving(false)
  }

  // Agregar ítem directo bajo este nodo
  const addItem = async () => {
    if (!newNombre.trim()||addingSub) return
    setAddingSub(true)
    // Construir n1/n2/n3 según nivel de este nodo
    const body = {
      nombre: newNombre.trim(),
      unidad_default: newUnidad,
      n1: level===1 ? node.nombre : (node.n1_path || node.nombre),
      n2: level===2 ? node.nombre : (level===3 ? (node.n2_path||node.nombre) : null),
      n3: level===3 ? node.nombre : null,
    }
    const res = await fetch('/api/items', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      onItemAdded(data)
      setNewNombre(''); setShowAddItem(false)
    }
    setAddingSub(false)
  }

  const ei = { padding:'4px 8px', border:'1.5px solid var(--accent)', borderRadius:6, fontSize:12, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit' }

  return (
    <div>
      {/* Fila del nodo */}
      <div className="cat-row"
        style={{ display:'flex', alignItems:'center', gap:5, padding:`6px 10px 6px ${indent+4}px`, borderBottom:'1px solid var(--border)', background:'var(--surface)', position: level===1 ? 'sticky' : undefined, top: level===1 ? 0 : undefined, zIndex: level===1 ? 3 : undefined }}>
        
        <button onClick={()=>setOpen(o=>!o)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex', flexShrink:0 }}>
          {open ? <IconCaretDown size={11} aria-hidden="true" /> : <IconCaretRight size={11} aria-hidden="true" />}
        </button>

        {node.icono && <span style={{ fontSize:13, flexShrink:0 }}>{node.icono}</span>}

        {editMode ? (
          <input value={editNombre} onChange={e=>setEditNombre(e.target.value)} autoFocus
            onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape'){ setEditMode(false); setEditNombre(node.nombre) }}}
            style={{ ...ei, flex:1, fontSize:level===1?14:12, fontWeight:700 }} />
        ) : (
          <span onClick={()=>setOpen(o=>!o)} style={{ flex:1, fontSize:level===1?14:12, fontWeight:level===1?800:700, color: level===1 ? c.bg : 'var(--text-primary)', cursor:'pointer' }}>
            {node.nombre}
            {level===1 && <span style={{ marginLeft:5, fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:99, background:c.light, color:c.bg }}>n{level}</span>}
          </span>
        )}

        {/* Acciones (visibles solo en hover vía CSS) */}
        <div className="row-actions" style={{ display:'flex', gap:1, opacity:0, transition:'opacity .1s', flexShrink:0 }}>
          {editMode ? (
            <>
              <button onClick={saveEdit} disabled={saving} title="Guardar" style={{ border:'none', background:'none', cursor:'pointer', color:'#10b981', padding:3, display:'flex' }}>
                {saving ? <IconSpinner size={11} style={{ animation:'spin 1s linear infinite' }} /> : <IconCheck size={11} />}
              </button>
              <button onClick={()=>{ setEditMode(false); setEditNombre(node.nombre) }} title="Cancelar" style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:3, display:'flex' }}>
                <IconCerrar size={11} />
              </button>
            </>
          ) : (
            <>
              {/* Agregar sub-categoría (solo si nivel < 3) */}
              {level < 3 && (
                <button onClick={()=>setShowAddCat(true)} title={`Nueva ${NIVEL_LABEL[level]}`}
                  style={{ border:'none', background:'none', cursor:'pointer', color:c.bg, padding:3, display:'flex', borderRadius:4 }}>
                  <IconEtiquetas size={11} />
                </button>
              )}
              {/* Agregar ítem */}
              <button onClick={()=>{ setShowAddItem(o=>!o); setOpen(true) }} title="Agregar ítem aquí"
                style={{ border:'none', background:'none', cursor:'pointer', color:'#10b981', padding:3, display:'flex', borderRadius:4 }}>
                <IconItems size={11} />
              </button>
              {/* Editar nombre */}
              <button onClick={()=>setEditMode(true)} title="Editar nombre"
                style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:3, display:'flex', borderRadius:4 }}>
                <IconEditar size={11} />
              </button>
              {/* Eliminar (solo nodos no-sistema) */}
              {!node.es_sistema && (
                confirmDel ? (
                  <span style={{ display:'flex', gap:3, alignItems:'center' }}>
                    <span style={{ fontSize:9, color:'#ef4444' }}>¿Eliminar?</span>
                    <button onClick={deleteCat} style={{ border:'none', background:'#ef4444', color:'#fff', borderRadius:3, padding:'1px 5px', fontSize:9, fontWeight:700, cursor:'pointer' }}>Sí</button>
                    <button onClick={()=>setConfirmDel(false)} style={{ border:'none', background:'var(--border)', borderRadius:3, padding:'1px 5px', fontSize:9, fontWeight:700, cursor:'pointer' }}>No</button>
                  </span>
                ) : (
                  <button onClick={()=>setConfirmDel(true)} title="Eliminar"
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', padding:3, display:'flex', borderRadius:4 }}>
                    <IconEliminar size={11} />
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Form agregar ítem inline */}
      {showAddItem && open && (
        <div style={{ display:'flex', gap:6, alignItems:'center', padding:`5px 10px 5px ${indent+22}px`, background:'#f0fdf4', borderBottom:'1px solid var(--border)' }}>
          <IconItems size={11} color="#10b981" style={{ flexShrink:0 }} />
          <input value={newNombre} onChange={e=>setNewNombre(e.target.value)} autoFocus
            onKeyDown={e=>{ if(e.key==='Enter') addItem(); if(e.key==='Escape') setShowAddItem(false) }}
            placeholder="Nombre del ítem…"
            style={{ flex:1, padding:'4px 8px', border:'1.5px solid #10b981', borderRadius:6, fontSize:12, background:'white', outline:'none', fontFamily:'inherit' }} />
          <select value={newUnidad} onChange={e=>setNewUnidad(e.target.value)}
            style={{ padding:'4px 6px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:12, background:'white', outline:'none', cursor:'pointer' }}>
            {units.map(u=><option key={u}>{u}</option>)}
          </select>
          <button onClick={addItem} disabled={addingSub||!newNombre.trim()}
            style={{ border:'none', background:'#10b981', color:'#fff', borderRadius:6, padding:'4px 9px', fontSize:11, fontWeight:700, cursor:newNombre.trim()?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:3 }}>
            {addingSub ? <IconSpinner size={10} style={{ animation:'spin 1s linear infinite' }} /> : <IconCheck size={10} />}
            OK
          </button>
          <button onClick={()=>setShowAddItem(false)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}>
            <IconCerrar size={11} />
          </button>
        </div>
      )}

      {/* Hijos */}
      {open && (
        <>
          {node.children?.map(child => (
            <CatNode key={child.id}
              node={{ ...child, n1_path: level===1 ? node.nombre : child.n1_path, n2_path: level===2 ? node.nombre : child.n2_path }}
              level={level+1} allItems={allItems}
              onCatCreated={onCatCreated} onCatEdited={onCatEdited} onCatDeleted={onCatDeleted}
              onItemAdded={onItemAdded} onItemUpdated={onItemUpdated} onItemDeleted={onItemDeleted}
            />
          ))}
          {myItems.map(it => (
            <ItemRow key={it.id} item={it} indent={indent+22}
              onUpdate={onItemUpdated} onDelete={onItemDeleted} />
          ))}
        </>
      )}

      {/* Modal nueva sub-categoría */}
      {showAddCat && (
        <NewCatModal
          parentId={node.id} parentLevel={level} parentNombre={node.nombre}
          onSave={cat => { onCatCreated(cat); setShowAddCat(false); setOpen(true) }}
          onClose={() => setShowAddCat(false)}
        />
      )}
    </div>
  )
}

// ── CatalogManager principal ──────────────────────────────────────────────────
export default function CatalogManager() {
  const { refetch: refetchCats }    = useCategories()
  const [rawCats,  setRawCats]   = useState([])
  const [items,    setItems]     = useState([])
  const [loading,  setLoading]   = useState(true)
  const [search,   setSearch]    = useState('')
  const [addRoot,  setAddRoot]   = useState(false)

  const loadCats = useCallback(async () => {
    const res = await fetch('/api/categorias')
    const d   = await res.json()
    setRawCats(Array.isArray(d) ? d.filter(c => c.nivel <= 3) : [])
  }, [])

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/items')
    const d   = await res.json()
    setItems(Array.isArray(d) ? d : [])
  }, [])

  useEffect(() => {
    Promise.all([loadCats(), loadItems()]).finally(() => setLoading(false))
  }, [loadCats, loadItems])

  const tree = useMemo(() => {
    const map = {}
    rawCats.forEach(c => { map[c.id] = { ...c, children:[] } })
    const roots = []
    rawCats.forEach(c => {
      if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id])
      else if (!c.parent_id) roots.push(map[c.id])
    })
    return roots.sort((a, b) => (a.orden||0)-(b.orden||0))
  }, [rawCats])

  // Filtrar árbol por búsqueda
  const filteredTree = useMemo(() => {
    if (!search) return tree
    const q = search.toLowerCase()
    const matchNode = node => {
      if (node.nombre.toLowerCase().includes(q)) return true
      if (node.children?.some(matchNode)) return true
      const nivel = node.nivel
      if (nivel === 1) return items.some(it => it.n1 === node.nombre && (it.nombre.toLowerCase().includes(q)))
      if (nivel === 2) return items.some(it => it.n2 === node.nombre && (it.nombre.toLowerCase().includes(q)))
      if (nivel === 3) return items.some(it => it.n3 === node.nombre && (it.nombre.toLowerCase().includes(q)))
      return false
    }
    return tree.filter(matchNode)
  }, [tree, items, search])

  const handleCatCreated = (cat) => { setRawCats(p=>[...p, cat]); refetchCats() }
  const handleCatEdited  = (cat) => { setRawCats(p=>p.map(c=>c.id===cat.id?{...c,...cat}:c)); refetchCats() }
  const handleCatDeleted = (id)  => { setRawCats(p=>p.filter(c=>c.id!==id)); refetchCats() }
  const handleItemAdded  = (item)=> setItems(p => { const i=p.findIndex(x=>x.id===item.id); return i>=0?p.map(x=>x.id===item.id?item:x):[...p,item] })
  const handleItemUpdated= (item)=> setItems(p=>p.map(it=>it.id===item.id?item:it))
  const handleItemDeleted= (id)  => setItems(p=>p.filter(it=>it.id!==id))

  return (
    <div>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .cat-row:hover { background: var(--surface2) !important; }
        .cat-row:hover .row-actions { opacity: 1 !important; }
        .item-row:hover { background: var(--surface2) !important; }
        .item-row:hover .row-actions { opacity: 1 !important; }
      `}</style>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar categorías e ítems…"
            style={{ width:'100%', padding:'8px 12px 8px 30px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        <button onClick={()=>setAddRoot(true)}
          style={{ padding:'8px 14px', border:'none', borderRadius:9, background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <IconPlus size={13} aria-hidden="true" /> Nuevo Tipo
        </button>
      </div>

      <p style={{ margin:'0 0 10px', fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>
        Hover sobre una fila para ver acciones · <span style={{ color:'#10b981', fontWeight:600 }}>+ítem</span> agrega directamente en ese nivel · <span style={{ color:'var(--accent)', fontWeight:600 }}>+cat</span> crea una sub-categoría
      </p>

      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}>
          <IconSpinner size={22} style={{ animation:'spin 1s linear infinite', color:'var(--text-muted)' }} aria-hidden="true" />
        </div>
      ) : (
        <div style={{ border:'1.5px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          {filteredTree.map(node => (
            <CatNode key={node.id} node={node} level={1} allItems={items}
              onCatCreated={handleCatCreated} onCatEdited={handleCatEdited} onCatDeleted={handleCatDeleted}
              onItemAdded={handleItemAdded} onItemUpdated={handleItemUpdated} onItemDeleted={handleItemDeleted}
            />
          ))}
          {!filteredTree.length && (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              {search ? `Sin resultados para "${search}"` : 'Sin categorías. Creá la primera con "Nuevo Tipo".'}
            </div>
          )}
        </div>
      )}

      {addRoot && (
        <NewCatModal parentId={null} parentLevel={0} parentNombre={null}
          onSave={cat=>{ handleCatCreated(cat); setAddRoot(false) }}
          onClose={()=>setAddRoot(false)}
        />
      )}
    </div>
  )
}
