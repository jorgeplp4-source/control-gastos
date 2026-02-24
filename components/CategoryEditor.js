'use client'
import { useState, useEffect, useCallback } from 'react'

const ICONOS = ['📦','🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','🔧','📱','🌿','💈','🎓','🏥','💰','🔑']
const NIVEL_LABELS = { 1: 'Tipo', 2: 'Área', 3: 'Subcategoría', 4: 'Ítem' }
const NIVEL_COLORS_MAP = { 1: '#1e40af', 2: '#059669', 3: '#d97706', 4: '#7c3aed' }

// Construye árbol desde lista plana
function buildTree(list) {
  const map = {}
  list.forEach(c => { map[c.id] = { ...c, children: [] } })
  const roots = []
  list.forEach(c => {
    if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id])
    else if (!c.parent_id) roots.push(map[c.id])
  })
  return roots
}

export default function CategoryEditor() {
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddFor, setShowAddFor] = useState(null) // parent_id para nueva categoría
  const [newForm, setNewForm] = useState({ nombre: '', icono: '📦', color: '#3b82f6' })
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/categorias')
    const data = await res.json()
    setCats(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const tree = buildTree(cats)

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditForm({ nombre: cat.nombre, icono: cat.icono, color: cat.color })
  }

  const saveEdit = async (id) => {
    const res = await fetch('/api/categorias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    if (res.ok) { setEditingId(null); load() }
    else { const d = await res.json(); setError(d.error) }
  }

  const handleAdd = async (parentId, nivel) => {
    if (!newForm.nombre.trim()) return
    const res = await fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, parent_id: parentId || null, nivel }),
    })
    if (res.ok) {
      setShowAddFor(null)
      setNewForm({ nombre: '', icono: '📦', color: '#3b82f6' })
      load()
      if (parentId) setExpanded(prev => ({ ...prev, [parentId]: true }))
    } else {
      const d = await res.json(); setError(d.error)
    }
  }

  const handleDelete = async (id) => {
    const res = await fetch(`/api/categorias?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setDeleteConfirm(null); load() }
    else { const d = await res.json(); setError(d.error); setDeleteConfirm(null) }
  }

  const S = styles

  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children?.length > 0
    const isExpanded = expanded[node.id]
    const isEditing = editingId === node.id
    const levelColor = NIVEL_COLORS_MAP[node.nivel] || '#64748b'
    const canAddChild = node.nivel < 4
    const isSystem = node.es_sistema

    return (
      <div key={node.id} style={{ marginLeft: depth * 20 }}>
        <div style={{ ...S.node, borderLeft: `3px solid ${levelColor}20` }}>
          {/* Expand toggle */}
          <button onClick={() => toggle(node.id)} style={{ ...S.expandBtn, visibility: hasChildren ? 'visible' : 'hidden' }}>
            {isExpanded ? '▾' : '▸'}
          </button>

          {/* Ícono + nombre */}
          {isEditing ? (
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={editForm.nombre} onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                style={S.inp} autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(node.id)} />
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 260 }}>
                {ICONOS.map(ic => (
                  <button key={ic} onClick={() => setEditForm(p => ({ ...p, icono: ic }))}
                    style={{ fontSize: 16, padding: 2, border: `2px solid ${editForm.icono === ic ? 'var(--accent)' : 'transparent'}`, borderRadius: 4, background: 'none', cursor: 'pointer' }}>
                    {ic}
                  </button>
                ))}
              </div>
              <input type="color" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
              <button onClick={() => saveEdit(node.id)} style={S.btnSave}>✓</button>
              <button onClick={() => setEditingId(null)} style={S.btnCancel}>✕</button>
            </div>
          ) : (
            <>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{node.icono}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{node.nombre}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${levelColor}18`, color: levelColor }}>
                N{node.nivel} · {NIVEL_LABELS[node.nivel]}
              </span>
              {isSystem && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>sistema</span>}

              {/* Acciones */}
              {!isSystem && (
                <button onClick={() => startEdit(node)} style={S.actionBtn} title="Editar">✏️</button>
              )}
              {canAddChild && (
                <button onClick={() => { setShowAddFor(node.id); setNewForm({ nombre: '', icono: '📦', color: levelColor }) }}
                  style={S.actionBtn} title={`Agregar ${NIVEL_LABELS[node.nivel + 1]}`}>➕</button>
              )}
              {!isSystem && (
                <button onClick={() => setDeleteConfirm(node)} style={{ ...S.actionBtn, color: '#ef4444' }} title="Eliminar">🗑️</button>
              )}
            </>
          )}
        </div>

        {/* Panel agregar hijo */}
        {showAddFor === node.id && (
          <div style={{ ...S.addPanel, marginLeft: (depth + 1) * 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: levelColor }}>+ {NIVEL_LABELS[node.nivel + 1]}</span>
            <input placeholder="Nombre…" value={newForm.nombre} onChange={e => setNewForm(p => ({ ...p, nombre: e.target.value }))}
              style={{ ...S.inp, flex: 1 }} autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd(node.id, node.nivel + 1)} />
            <div style={{ display: 'flex', gap: 3 }}>
              {ICONOS.slice(0, 10).map(ic => (
                <button key={ic} onClick={() => setNewForm(p => ({ ...p, icono: ic }))}
                  style={{ fontSize: 15, padding: 2, border: `2px solid ${newForm.icono === ic ? 'var(--accent)' : 'transparent'}`, borderRadius: 4, background: 'none', cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
            <button onClick={() => handleAdd(node.id, node.nivel + 1)} style={S.btnSave}>Agregar</button>
            <button onClick={() => setShowAddFor(null)} style={S.btnCancel}>✕</button>
          </div>
        )}

        {/* Hijos */}
        {isExpanded && hasChildren && (
          <div>{node.children.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando categorías…</div>

  return (
    <div>
      {/* Error toast */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

      {/* Confirm delete modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, maxWidth: 340, width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>¿Eliminar categoría?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              <strong>{deleteConfirm.nombre}</strong> — se eliminará permanentemente.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={{ ...styles.btnSave, background: '#ef4444' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
          {cats.filter(c => !c.es_sistema).length} categorías propias · {cats.filter(c => c.es_sistema).length} del sistema
        </p>
        {/* Agregar N1 */}
        {showAddFor === 'root' ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Nuevo tipo…" value={newForm.nombre} onChange={e => setNewForm(p => ({ ...p, nombre: e.target.value }))}
              style={{ ...styles.inp, width: 160 }} autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd(null, 1)} />
            <button onClick={() => handleAdd(null, 1)} style={styles.btnSave}>Agregar</button>
            <button onClick={() => setShowAddFor(null)} style={styles.btnCancel}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowAddFor('root')} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px dashed var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + Nuevo tipo (N1)
          </button>
        )}
      </div>

      {/* Árbol */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {tree.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Sin categorías. Ejecutá la migración SQL primero.</div>}
        {tree.map((node, i) => (
          <div key={node.id} style={{ borderBottom: i < tree.length - 1 ? '1px solid var(--border)' : 'none' }}>
            {renderNode(node, 0)}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  node:      { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--surface)', minHeight: 44, flexWrap: 'wrap' },
  expandBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', width: 20, flexShrink: 0 },
  actionBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', borderRadius: 4, color: 'var(--text-muted)' },
  addPanel:  { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--accent-light)', borderTop: '1px solid var(--border)', flexWrap: 'wrap' },
  inp:       { padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' },
  btnSave:   { padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  btnCancel: { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' },
}
