'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { N1_COLORS, uniq } from '../lib/constants'
import { useUnits } from '../lib/useUnits'
import { useCategories } from '../lib/useCategories'
import {
  IconBuscar, IconCerrar, IconPlus, IconCheck, IconCaretDown, IconCaretRight,
  IconGuardar, IconSpinner, IconEtiqueta, IconEtiquetas, IconAdvertencia,
} from '../lib/icons'

const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱']

// ── Formulario rápido para crear categoría inline ─────────────────────────────
function InlineCatForm({ parentNode, onSave, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const inp = useRef(null)

  useEffect(() => { inp.current?.focus() }, [])

  const nivel = (parentNode?.nivel || 0) + 1
  const nivelLabel = { 1:'Tipo', 2:'Área', 3:'Subcategoría' }[nivel] || 'Categoría'

  const handleSave = async () => {
    if (!nombre.trim() || saving) return
    setSaving(true); setError('')
    const res = await fetch('/api/categorias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), parent_id: parentNode?.id || null, nivel }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error'); setSaving(false); return }
    onSave(data)
  }

  return (
    <div style={{ padding:'8px 10px', background:'var(--accent-light)', border:'1.5px solid var(--accent)', borderRadius:9, display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--accent)', textTransform:'uppercase' }}>
        + Nueva {nivelLabel} {parentNode ? `bajo "${parentNode.nombre}"` : '(Tipo raíz)'}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <input ref={inp} value={nombre} onChange={e => { setNombre(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
          placeholder={`Nombre del ${nivelLabel.toLowerCase()}…`}
          style={{ flex:1, padding:'6px 9px', border:'1.5px solid var(--accent)', borderRadius:7, fontSize:12, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit' }} />
        <button onClick={handleSave} disabled={!nombre.trim() || saving}
          style={{ padding:'5px 10px', border:'none', borderRadius:7, background:nombre.trim()?'var(--accent)':'var(--border)', color:nombre.trim()?'#fff':'var(--text-muted)', fontWeight:700, fontSize:12, cursor:nombre.trim()?'pointer':'not-allowed', flexShrink:0 }}>
          {saving ? '…' : 'Crear'}
        </button>
        <button onClick={onCancel}
          style={{ padding:'5px 8px', border:'none', borderRadius:7, background:'var(--border)', color:'var(--text-muted)', cursor:'pointer', display:'flex', flexShrink:0 }}>
          <IconCerrar size={12} aria-hidden="true" />
        </button>
      </div>
      {error && <p style={{ margin:0, fontSize:11, color:'#ef4444' }}>{error}</p>}
    </div>
  )
}

// ── Nodo del árbol de selección ───────────────────────────────────────────────
function TreeNode({ node, level, selectedPath, onSelect, onCatCreated, searchQ }) {
  const [open, setOpen] = useState(level < 2 || (selectedPath && selectedPath.startsWith(node.nombre)))
  const [adding, setAdding] = useState(false)

  const hasChildren  = node.children?.length > 0
  const indent       = level * 14
  const c            = level === 1 ? (N1_COLORS[node.nombre] || { bg:'#3b82f6', light:'#eff6ff', text:'#3b82f6' }) : { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }
  const isSelected   = selectedPath === node.nombre || (selectedPath && selectedPath.endsWith(' › ' + node.nombre))
  const matchSearch  = !searchQ || node.nombre.toLowerCase().includes(searchQ)

  if (searchQ && !matchSearch && !node.children?.some(ch => ch.nombre.toLowerCase().includes(searchQ))) return null

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:4, padding:`5px 8px 5px ${indent + 6}px`, cursor:'pointer',
        background: isSelected ? c.light : 'transparent',
        border: `1.5px solid ${isSelected ? c.bg : 'transparent'}`,
        borderRadius:8, margin:'1px 4px', transition:'background .1s', userSelect:'none' }}>
        
        {hasChildren ? (
          <span onClick={() => setOpen(o => !o)} style={{ color:'var(--text-muted)', flexShrink:0, padding:'0 2px' }}>
            {open ? <IconCaretDown size={10} aria-hidden="true" /> : <IconCaretRight size={10} aria-hidden="true" />}
          </span>
        ) : (
          <span style={{ width:14, flexShrink:0 }} />
        )}

        {node.icono && <span style={{ fontSize:12, flexShrink:0 }}>{node.icono}</span>}

        <span onClick={() => onSelect(node)} style={{ flex:1, fontSize:12, fontWeight: isSelected ? 700 : (level===1?700:500), color: isSelected ? c.bg : (level===1 ? c.bg : 'var(--text-primary)'), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {node.nombre}
        </span>

        {isSelected && <IconCheck size={12} color={c.bg} style={{ flexShrink:0 }} aria-hidden="true" />}

        {/* Botón agregar sub-categoría */}
        {level < 3 && (
          <button onClick={e => { e.stopPropagation(); setAdding(a => !a); setOpen(true) }}
            title={`Crear sub-categoría bajo "${node.nombre}"`}
            style={{ border:'none', background:'none', cursor:'pointer', color:c.bg, padding:'1px 3px', borderRadius:4, display:'flex', flexShrink:0, opacity:0.6 }}
            className="tree-add-btn">
            <IconPlus size={10} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Form nueva sub-categoría */}
      {adding && (
        <div style={{ padding:`4px 8px 4px ${indent + 20}px` }}>
          <InlineCatForm
            parentNode={node}
            onSave={cat => { onCatCreated(cat); setAdding(false); setOpen(true) }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {open && node.children?.map(child => (
        <TreeNode key={child.id} node={child} level={level + 1}
          selectedPath={selectedPath} onSelect={onSelect} onCatCreated={onCatCreated} searchQ={searchQ} />
      ))}
    </div>
  )
}

// ── Selector jerárquico (abre mini-modal con árbol) ───────────────────────────
function TreeCategoryPicker({ value, onChange, onCatCreated }) {
  const { categories, refetch } = useCategories()
  const [open,    setOpen]    = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [addRoot, setAddRoot] = useState(false)
  const panelRef = useRef(null)

  // Construir árbol
  const tree = useMemo(() => {
    const map = {}
    const flatCats = categories
      .filter((c, i, arr) => {
        // Deduplicar: obtener nodos únicos por nombre+nivel
        return arr.findIndex(x => x.n1 === c.n1 && x.n1_id === c.n1_id) === i || true
      })

    // Obtener nodos únicos de la API de categorías (que devuelve filas n1/n2/n3)
    // Reconstruir árbol de n1→n2→n3
    const n1map = {}, n2map = {}
    categories.forEach(c => {
      if (!n1map[c.n1]) n1map[c.n1] = { id: c.n1_id, nombre: c.n1, nivel: 1, icono: c.icono, children: [] }
      if (c.n2 && !n2map[`${c.n1}|${c.n2}`]) {
        const n2node = { id: c.n2_id, nombre: c.n2, nivel: 2, parent_id: c.n1_id, children: [] }
        n2map[`${c.n1}|${c.n2}`] = n2node
        n1map[c.n1].children.push(n2node)
      }
      if (c.n2 && c.n3) {
        const key2 = `${c.n1}|${c.n2}`
        const n3node = { id: c.n3_id, nombre: c.n3, nivel: 3, parent_id: c.n2_id, children: [] }
        if (!n2map[key2].children.find(x => x.nombre === c.n3)) {
          n2map[key2].children.push(n3node)
        }
      }
    })
    return Object.values(n1map).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [categories])

  // Selección actual como ruta legible
  const selectedPath = value.n1 ? [value.n1, value.n2, value.n3].filter(Boolean).join(' › ') : ''
  const c = N1_COLORS[value.n1] || { bg:'#64748b', light:'var(--surface2)', text:'#64748b' }

  useEffect(() => {
    if (!open) return
    const h = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const handleSelect = (node) => {
    if (node.nivel === 1)      onChange({ n1: node.nombre, n2: '', n3: '' })
    else if (node.nivel === 2) {
      // Buscar n1 padre
      const parent = tree.find(n1 => n1.children?.some(n2 => n2.id === node.id))
      onChange({ n1: parent?.nombre || value.n1, n2: node.nombre, n3: '' })
    } else if (node.nivel === 3) {
      // Encontrar n1 y n2
      let n1name = value.n1, n2name = ''
      for (const n1 of tree) {
        for (const n2 of n1.children || []) {
          if (n2.children?.some(n3 => n3.id === node.id)) {
            n1name = n1.nombre; n2name = n2.nombre; break
          }
        }
      }
      onChange({ n1: n1name, n2: n2name, n3: node.nombre })
    }
    setOpen(false); setSearchQ('')
  }

  const handleCatCreated = (cat) => {
    refetch()
    onCatCreated?.()
    setAddRoot(false)
  }

  const q = searchQ.toLowerCase()

  return (
    <div style={{ position:'relative' }}>
      <style>{`.tree-add-btn { opacity: 0 !important; } div:hover > div > .tree-add-btn, div:hover > .tree-add-btn { opacity: 0.6 !important; }`}</style>

      {/* Botón trigger */}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'9px 12px', border:`1.5px solid ${open ? 'var(--accent)' : (value.n1 ? c.bg+'80' : 'var(--border)')}`, borderRadius:10, background: value.n1 ? c.light : 'var(--surface2)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, transition:'all .15s', boxShadow: open ? '0 0 0 3px rgba(99,102,241,.12)' : 'none' }}>
        <span style={{ flex:1, fontSize:13, fontWeight: value.n1 ? 700 : 400, color: value.n1 ? c.text : 'var(--text-muted)' }}>
          {selectedPath || '— Elegí una categoría —'}
        </span>
        <IconCaretDown size={13} color={value.n1 ? c.text : 'var(--text-muted)'} style={{ flexShrink:0, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .15s' }} aria-hidden="true" />
      </button>

      {/* Panel árbol */}
      {open && (
        <div ref={panelRef} style={{ position:'absolute', top:'calc(100% + 5px)', left:0, right:0, zIndex:700, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:14, boxShadow:'0 16px 48px rgba(0,0,0,.15)', overflow:'hidden', minWidth:280 }}>
          
          {/* Búsqueda dentro del árbol */}
          <div style={{ padding:'10px 10px 6px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ position:'relative' }}>
              <IconBuscar size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} aria-hidden="true" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar categoría…"
                style={{ width:'100%', padding:'6px 8px 6px 26px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:12, background:'var(--surface2)', color:'var(--text-primary)', outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>

          {/* Árbol */}
          <div style={{ maxHeight:260, overflowY:'auto', padding:'6px 0' }}>
            {tree.map(n1 => (
              <TreeNode key={n1.id} node={n1} level={1}
                selectedPath={selectedPath} onSelect={handleSelect}
                onCatCreated={handleCatCreated} searchQ={q} />
            ))}
            {!tree.length && (
              <div style={{ padding:'20px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
                Sin categorías. Creá la primera abajo.
              </div>
            )}
          </div>

          {/* Acciones del footer */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'8px 10px', display:'flex', gap:6, alignItems:'center', background:'var(--surface2)' }}>
            {value.n1 && (
              <button onClick={() => { onChange({ n1:'', n2:'', n3:'' }); setOpen(false) }}
                style={{ padding:'5px 10px', border:'none', borderRadius:7, background:'#fee2e2', color:'#ef4444', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                Quitar categoría
              </button>
            )}
            <div style={{ flex:1 }} />
            <button onClick={() => setAddRoot(a => !a)}
              style={{ padding:'5px 10px', border:'1.5px solid var(--accent)', borderRadius:7, background:'var(--accent-light)', color:'var(--accent)', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <IconPlus size={11} aria-hidden="true" /> Nuevo Tipo
            </button>
          </div>

          {/* Form nueva categoría raíz */}
          {addRoot && (
            <div style={{ padding:'0 10px 10px' }}>
              <InlineCatForm
                parentNode={null}
                onSave={handleCatCreated}
                onCancel={() => setAddRoot(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal crear / editar ítem ─────────────────────────────────────────────────
export function ItemFormModal({ item = null, initialNombre = '', onSave, onClose }) {
  const isEdit = !!item?.id
  const { units } = useUnits()
  const { refetch } = useCategories()

  const [nombre, setNombre] = useState(item?.nombre || initialNombre)
  const [unidad, setUnidad] = useState(item?.unidad_default || 'unidad')
  const [cat,    setCat]    = useState({
    n1: item?.n1 || '',
    n2: item?.n2 || '',
    n3: item?.n3 || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const valid = nombre.trim().length >= 2 && !!cat.n1

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true); setError('')
    try {
      const method = isEdit ? 'PUT' : 'POST'
      const body = {
        nombre:         nombre.trim(),
        n1:             cat.n1,
        n2:             cat.n2 || null,
        n3:             cat.n3 || null,
        unidad_default: unidad,
      }
      if (isEdit) body.id = item.id
      const res  = await fetch('/api/items', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSave(data)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface2)', outline:'none', width:'100%', color:'var(--text-primary)', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:900, backdropFilter:'blur(2px)' }} aria-hidden="true" />
      <div role="dialog" aria-modal="true"
        style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:901, width:'min(480px,95vw)', background:'var(--surface)', borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,.25)', display:'flex', flexDirection:'column', maxHeight:'90vh', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IconEtiqueta size={17} color="#fff" aria-hidden="true" />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>
                {isEdit ? 'Editar ítem' : 'Nuevo ítem'}
              </h3>
              <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>
                Tipo obligatorio · Área y Subcategoría opcionales
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:6, display:'flex' }}>
            <IconCerrar size={19} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', display:'flex', flexDirection:'column', gap:16 }}>

          <div>
            <label style={lbl}>Nombre del ítem *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder='Ej: Vino, Luz, Pollo, Netflix…'
              autoFocus style={inp}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            {nombre.trim().length > 0 && nombre.trim().length < 2 && (
              <p style={{ fontSize:11, color:'#ef4444', margin:'3px 0 0' }}>Mínimo 2 caracteres</p>
            )}
          </div>

          <div>
            <label style={lbl}>Unidad por defecto</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <label style={{ ...lbl, marginBottom:0 }}>Categoría</label>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>Clic en árbol para navegar · + para crear</span>
            </div>
            <TreeCategoryPicker value={cat} onChange={setCat} onCatCreated={refetch} />
          </div>

          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#fee2e2', borderRadius:9 }}>
              <IconAdvertencia size={15} color="#ef4444" aria-hidden="true" />
              <span style={{ fontSize:13, color:'#dc2626', fontWeight:600 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex', gap:10, padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0, alignItems:'center' }}>
          {nombre.trim().length >= 2 && !cat.n1 && (
            <span style={{ fontSize:12, color:'#d97706', fontWeight:600, flex:1 }}>⚠ Seleccioná el Tipo primero</span>
          )}
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:13, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!valid || saving}
            style={{ padding:'9px 22px', borderRadius:9, border:'none', fontSize:13, fontWeight:800, cursor:valid&&!saving?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:6, background:valid?'var(--accent)':'var(--border)', color:valid?'#fff':'var(--text-muted)', boxShadow:valid?'0 4px 12px rgba(99,102,241,.3)':'none' }}>
            {saving
              ? <><IconSpinner size={14} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" /> Guardando…</>
              : <><IconGuardar size={14} aria-hidden="true" /> {isEdit ? 'Guardar' : 'Crear ítem'}</>}
          </button>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )
}

// Alias para compatibilidad
export const CreateItemModal = (props) => <ItemFormModal {...props} />

// ── ItemSearch ────────────────────────────────────────────────────────────────
export default function ItemSearch({ value, onChange, onUnitChange, disabled }) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [focused,   setFocused]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  const debounce = useRef(null)

  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          inputRef.current  && !inputRef.current.contains(e.target))
        { setOpen(false); setFocused(false) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback((q) => {
    clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/items?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 280)
  }, [])

  const handleChange = e => {
    const q = e.target.value
    setQuery(q)
    q.length >= 1 ? search(q) : (setResults([]), setOpen(false))
  }

  const handleSelect = item => {
    onChange(item)
    onUnitChange?.(item.unidad_default)
    setQuery(''); setOpen(false); setFocused(false)
  }

  const handleClear = () => {
    onChange(null); onUnitChange?.(null)
    setQuery(''); setResults([])
  }

  const ruta    = value ? [value.n1, value.n2, value.n3].filter(Boolean).join(' › ') : ''
  const n1Color = (N1_COLORS[value?.n1] || {}).bg || '#3b82f6'

  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        Ítem / Producto
      </label>

      {value && !query && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:(N1_COLORS[value.n1]||{}).light||'#eff6ff', borderRadius:10, border:`1.5px solid ${n1Color}40` }}>
          <IconCheck size={16} color={n1Color} style={{ flexShrink:0 }} aria-hidden="true" />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{value.nombre}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{ruta}</div>
          </div>
          {value.unidad_default && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:`${n1Color}18`, color:n1Color, fontWeight:700, flexShrink:0 }}>
              {value.unidad_default}
            </span>
          )}
          <button onClick={handleClear} aria-label="Quitar ítem"
            style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex', flexShrink:0 }}>
            <IconCerrar size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {!value && (
        <div style={{ position:'relative' }}>
          <input
            ref={inputRef} value={query} onChange={handleChange}
            onFocus={() => { setFocused(true); if (query.length >= 1) setOpen(true) }}
            placeholder='Buscá un ítem: "vino", "luz", "pollo"…'
            disabled={disabled} aria-label="Buscar ítem" aria-expanded={open}
            style={{ width:'100%', padding:'11px 44px 11px 14px', border:`1.5px solid ${focused?'var(--accent)':'var(--border)'}`, borderRadius:10, fontSize:14, background:'var(--surface)', color:'var(--text-primary)', outline:'none', fontFamily:'inherit', boxSizing:'border-box', boxShadow:focused?'0 0 0 3px rgba(99,102,241,.15)':'none', transition:'all .15s', opacity:disabled?0.5:1 }}
          />
          <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            {loading
              ? <IconSpinner size={17} color="var(--text-muted)" style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" />
              : <IconBuscar  size={17} color="var(--text-muted)" aria-hidden="true" />}
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

          {open && (
            <div ref={panelRef} role="listbox"
              style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:600, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, boxShadow:'var(--shadow-lg)', maxHeight:300, overflowY:'auto' }}>

              {results.map(item => {
                const ruta = [item.n1, item.n2, item.n3].filter(Boolean).join(' › ')
                const c    = N1_COLORS[item.n1] || { bg:'#64748b' }
                return (
                  <button key={item.id} role="option" onClick={() => handleSelect(item)}
                    style={{ width:'100%', padding:'10px 14px', border:'none', borderBottom:'1px solid var(--border)', background:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c.bg, flexShrink:0 }} aria-hidden="true" />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{item.nombre}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ruta}</div>
                    </div>
                    {item.unidad_default && (
                      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99, background:`${c.bg}18`, color:c.bg, fontWeight:700, flexShrink:0 }}>
                        {item.unidad_default}
                      </span>
                    )}
                  </button>
                )
              })}

              <button onClick={() => { setOpen(false); setShowModal(true) }}
                style={{ width:'100%', padding:'11px 14px', border:'none', background:'var(--accent-light)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, borderTop:results.length?'1px solid var(--border)':'none' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <IconPlus size={14} color="#fff" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>
                    {query ? `Agregar "${query}" como nuevo ítem` : 'Crear nuevo ítem'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {!results.length && query ? 'Sin resultados · ' : ''}Con árbol de categorías
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ItemFormModal
          initialNombre={query}
          onSave={item => { setShowModal(false); handleSelect(item) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
