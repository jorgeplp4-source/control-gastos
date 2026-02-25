'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { UNITS, N1_COLORS, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import {
  IconItems, IconBuscar, IconEditar, IconEliminar, IconGuardar,
  IconCerrar, IconSpinner, IconExito, IconAdvertencia, IconError,
  IconOrdenar, IconFiltros, IconPlus,
} from '../lib/icons'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ n1 }) {
  const c = N1_COLORS[n1] || { bg: '#64748b', light: '#f1f5f9', text: '#64748b' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: c.light, color: c.text, whiteSpace: 'nowrap',
    }}>{n1}</span>
  )
}

function UnitSelect({ value, onChange, style = {} }) {
  return (
    <select value={value || 'unidad'} onChange={e => onChange(e.target.value)}
      style={{
        padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8,
        fontSize: 12, fontWeight: 600, background: 'var(--surface)', color: 'var(--text-primary)',
        fontFamily: 'inherit', cursor: 'pointer', outline: 'none', ...style,
      }}>
      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
    </select>
  )
}

// ── Fila de ítem — vista normal ───────────────────────────────────────────────
function ItemRow({ item, onEdit, onDelete }) {
  const cat = [item.n1, item.n2, item.n3].filter(Boolean)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      borderBottom: '1px solid var(--border)', background: 'var(--surface)',
      transition: 'background .1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
    >
      {/* Nombre + categoría */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
          {item.nombre}
        </div>
        {cat.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {item.n1 && <Badge n1={item.n1} />}
            {cat.slice(1).map((x, i) => (
              <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {i > 0 && <span style={{ marginRight: 3 }}>›</span>}{x}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Unidad */}
      <div style={{
        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
        background: 'var(--surface2)', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
      }}>
        {item.unidad_default || 'unidad'}
      </div>

      {/* Usos */}
      {item.usos !== undefined && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 50, textAlign: 'right' }}>
          {item.usos} {item.usos === 1 ? 'uso' : 'usos'}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(item)} aria-label={`Editar ${item.nombre}`}
          style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <IconEditar size={14} aria-hidden="true" />
        </button>
        <button onClick={() => onDelete(item)} aria-label={`Eliminar ${item.nombre}`}
          style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <IconEliminar size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ── Modal de edición ──────────────────────────────────────────────────────────
function EditModal({ item, onSave, onClose }) {
  const { categories } = useCategories()
  const [form, setForm] = useState({
    nombre:         item.nombre         || '',
    unidad_default: item.unidad_default || 'unidad',
    n1: item.n1 || '', n2: item.n2 || '', n3: item.n3 || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.nombre.trim().length >= 2 && form.n1 && form.n2 && form.n3

  // Opciones de cascada
  const opts_n1 = useMemo(() => uniq(categories.map(c => c.n1)), [categories])
  const opts_n2 = useMemo(() => form.n1 ? uniq(categories.filter(c => c.n1 === form.n1).map(c => c.n2)) : [], [categories, form.n1])
  const opts_n3 = useMemo(() => form.n2 ? uniq(categories.filter(c => c.n1 === form.n1 && c.n2 === form.n2).map(c => c.n3)) : [], [categories, form.n1, form.n2])

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSave(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const inp = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Editar ítem"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconEditar size={18} weight="duotone" color="var(--accent)" aria-hidden="true" />
            Editar ítem
          </h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
            <IconCerrar size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Nombre */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Nombre del ítem</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
            placeholder="ej: Pollo entero, Yerba, Nafta..." autoFocus style={inp} />
        </div>

        {/* Unidad */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Unidad por defecto</label>
          <UnitSelect value={form.unidad_default} onChange={v => set('unidad_default', v)}
            style={{ width: '100%', padding: '10px 14px', fontSize: 14 }} />
        </div>

        {/* Categoría — 3 niveles en cascada */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...lbl, marginBottom: 12 }}>Categoría (3 niveles)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'n1', label: 'Nivel 1 — Tipo',         opts: opts_n1, onChg: v => setForm(p => ({ ...p, n1: v, n2: '', n3: '' })), dis: false },
              { key: 'n2', label: 'Nivel 2 — Área',         opts: opts_n2, onChg: v => setForm(p => ({ ...p, n2: v, n3: '' })),          dis: !form.n1 },
              { key: 'n3', label: 'Nivel 3 — Subcategoría', opts: opts_n3, onChg: v => set('n3', v),                                     dis: !form.n2 },
            ].map(({ key, label, opts, onChg, dis }) => (
              <div key={key}>
                <label style={{ ...lbl, marginBottom: 4, fontSize: 10 }}>{label}</label>
                <select value={form[key]} onChange={e => onChg(e.target.value)} disabled={dis || opts.length === 0}
                  style={{ ...inp, cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.5 : 1 }}>
                  <option value="">— elegí —</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 10, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconError size={16} aria-hidden="true" />{error}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!valid || saving}
            style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, background: valid && !saving ? 'var(--accent)' : 'var(--border)', color: valid && !saving ? '#fff' : 'var(--text-muted)', fontSize: 14, fontWeight: 800, cursor: valid && !saving ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <IconSpinner size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> : <IconGuardar size={16} aria-hidden="true" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmación de borrado ──────────────────────────────────────────
function DeleteModal({ item, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/items?id=${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      onConfirm(item.id)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Confirmar eliminación"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 400, boxShadow: '0 25px 60px rgba(0,0,0,.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IconEliminar size={28} color="#ef4444" aria-hidden="true" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
            ¿Eliminar ítem?
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Vas a eliminar <strong>"{item.nombre}"</strong> de tu lista de ítems guardados.
            {item.usos > 0 && (
              <span style={{ display: 'block', marginTop: 8, color: '#d97706', fontWeight: 600 }}>
                ⚠ Este ítem aparece en {item.usos} gasto{item.usos !== 1 ? 's' : ''} registrado{item.usos !== 1 ? 's' : ''}. Solo se elimina de la lista, los gastos no se modifican.
              </span>
            )}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={loading} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: loading ? 'var(--border)' : '#ef4444', color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <IconSpinner size={15} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> : <IconEliminar size={15} aria-hidden="true" />}
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ItemsPage() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [query, setQuery]       = useState('')
  const [sortBy, setSortBy]     = useState('nombre')   // 'nombre' | 'usos' | 'unidad' | 'n1'
  const [filterN1, setFilterN1] = useState('')          // filtro por tipo
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [toast, setToast]       = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Carga ítems con conteo de usos ────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/items')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')

      // Cargar conteo de usos (gastos que coinciden por nombre)
      const usosRes  = await fetch('/api/items/usos')
      const usosData = usosRes.ok ? await usosRes.json() : {}

      setItems(data.map(it => ({ ...it, usos: usosData[it.nombre] || 0 })))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtrado + ordenamiento ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items
    if (filterN1) list = list.filter(it => it.n1 === filterN1)
    if (query.trim().length >= 1) {
      const q = query.toLowerCase()
      list = list.filter(it =>
        it.nombre.toLowerCase().includes(q) ||
        
        (it.n1 || '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'usos')   return (b.usos || 0) - (a.usos || 0)
      if (sortBy === 'unidad') return (a.unidad_default || '').localeCompare(b.unidad_default || '')
      if (sortBy === 'n1')     return (a.n1 || '').localeCompare(b.n1 || '')
      return a.nombre.localeCompare(b.nombre)
    })
  }, [items, query, sortBy, filterN1])

  const tipos = useMemo(() => [...new Set(items.map(it => it.n1).filter(Boolean))].sort(), [items])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaved = (updated) => {
    setItems(prev => prev.map(it => it.id === updated.id ? { ...it, ...updated } : it))
    setEditItem(null)
    showToast(`"${updated.nombre}" actualizado`)
  }

  const handleDeleted = (id) => {
    const nombre = items.find(it => it.id === id)?.nombre || ''
    setItems(prev => prev.filter(it => it.id !== id))
    setDeleteItem(null)
    showToast(`"${nombre}" eliminado`, 'warn')
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  const inp = {
    padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 10,
    fontSize: 13, background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconItems size={20} weight="duotone" color="var(--accent)" aria-hidden="true" />
            Mis ítems
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            {loading ? 'Cargando…' : `${items.length} ítem${items.length !== 1 ? 's' : ''} guardado${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <button onClick={load} disabled={loading}
          style={{ padding: '8px 16px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading ? <IconSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> : null}
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 16px', background: '#fee2e2', borderRadius: 12, color: '#dc2626', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconAdvertencia size={18} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Barra de búsqueda + filtros */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar ítem…"
              aria-label="Filtrar ítems"
              style={{ ...inp, width: '100%', paddingLeft: 38, boxSizing: 'border-box' }}
            />
            <IconBuscar size={16} color="var(--text-muted)" aria-hidden="true"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Filtro tipo */}
          {tipos.length > 1 && (
            <select value={filterN1} onChange={e => setFilterN1(e.target.value)}
              aria-label="Filtrar por tipo"
              style={{ ...inp, cursor: 'pointer', paddingRight: 28 }}>
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* Ordenar */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            aria-label="Ordenar por"
            style={{ ...inp, cursor: 'pointer', paddingRight: 28 }}>
            <option value="nombre">A-Z por nombre</option>
            <option value="usos">Más usados</option>
            <option value="unidad">Por unidad</option>
            <option value="n1">Por tipo</option>
          </select>
        </div>
      )}

      {/* Lista */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <IconSpinner size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} aria-hidden="true" />
          <p style={{ margin: 0, fontSize: 13 }}>Cargando ítems…</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>
            No tenés ítems guardados todavía
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Cuando registrás un gasto y buscás un ítem, se guarda automáticamente en esta lista.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0, fontSize: 14 }}>Sin resultados para "<strong>{query}</strong>"</p>
          <button onClick={() => { setQuery(''); setFilterN1('') }}
            style={{ marginTop: 10, border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Limpiar filtros
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* Resumen filtrado */}
          {(query || filterN1) && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Mostrando {filtered.length} de {items.length} ítems
            </p>
          )}

          <div style={{ border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Encabezado */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ítem</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unidad</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 50, textAlign: 'right' }}>Usos</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 70 }}>Acciones</span>
            </div>

            {filtered.map(item => (
              <ItemRow key={item.id} item={item} onEdit={setEditItem} onDelete={setDeleteItem} />
            ))}
          </div>
        </>
      )}

      {/* Modales */}
      {editItem && (
        <EditModal item={editItem} onSave={handleSaved} onClose={() => setEditItem(null)} />
      )}
      {deleteItem && (
        <DeleteModal item={deleteItem} onConfirm={handleDeleted} onClose={() => setDeleteItem(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
          background: toast.type === 'warn' ? '#fef3c7' : 'var(--surface)',
          border: `1.5px solid ${toast.type === 'warn' ? '#d97706' : '#10b981'}`,
          color: toast.type === 'warn' ? '#92400e' : '#065f46',
          borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,.15)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.type === 'warn'
            ? <IconAdvertencia size={16} aria-hidden="true" />
            : <IconExito size={16} aria-hidden="true" />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}
