'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { UNITS, N1_COLORS, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import {
  IconBuscar, IconCerrar, IconPlus, IconCheck,
  IconGuardar, IconSpinner, IconEtiqueta, IconAdvertencia,
} from '../lib/icons'

/**
 * Cascada que respeta el árbol real de categorías.
 * 
 * Reglas:
 *  - n1 siempre obligatorio
 *  - n2 aparece SOLO si n1 tiene hijos en el árbol → opcional
 *  - n3 aparece SOLO si n2 tiene hijos en el árbol → opcional
 * 
 * Ejemplos:
 *   "Fijos" no tiene n2/n3 en el árbol → ítem queda: n1=Fijos, n2=null, n3=null
 *   "Variables › Alimentación › Bebidas" → n1, n2, n3 todos presentes
 *   "Variables › Alimentación" (sin bajar a n3) → n1, n2, n3=null
 */

// ── Cascada adaptativa ────────────────────────────────────────────────────────
function AdaptiveCascade({ value, onChange }) {
  const { categories } = useCategories()

  // Opciones derivadas del árbol real
  const opts_n1 = useMemo(() =>
    uniq(categories.map(c => c.n1)).sort(),
    [categories])

  const opts_n2 = useMemo(() =>
    value.n1
      ? uniq(categories.filter(c => c.n1 === value.n1 && c.n2).map(c => c.n2)).sort()
      : [],
    [categories, value.n1])

  const opts_n3 = useMemo(() =>
    value.n1 && value.n2
      ? uniq(categories.filter(c => c.n1 === value.n1 && c.n2 === value.n2 && c.n3).map(c => c.n3)).sort()
      : [],
    [categories, value.n1, value.n2])

  const hasN2 = opts_n2.length > 0
  const hasN3 = opts_n3.length > 0

  const col = N1_COLORS[value.n1] || { bg: '#64748b', light: '#f1f5f9', text: '#64748b' }

  const selStyle = (active) => ({
    padding: '9px 12px',
    border: `1.5px solid ${active ? col.bg : 'var(--border)'}`,
    borderRadius: 9,
    fontSize: 13,
    background: active ? col.light : 'var(--surface2)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  })

  const lbl = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'var(--text-muted)', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* N1 — siempre */}
      <div>
        <label style={lbl}>Tipo *</label>
        <select
          value={value.n1 || ''}
          onChange={e => onChange({ n1: e.target.value, n2: '', n3: '' })}
          style={selStyle(!!value.n1)}
        >
          <option value="">— elegí —</option>
          {opts_n1.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* N2 — solo si el árbol lo tiene */}
      {value.n1 && hasN2 && (
        <div>
          <label style={lbl}>Área</label>
          <select
            value={value.n2 || ''}
            onChange={e => onChange({ ...value, n2: e.target.value, n3: '' })}
            style={selStyle(!!value.n2)}
          >
            <option value="">— directo bajo "{value.n1}" —</option>
            {opts_n2.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {!value.n2 && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontStyle: 'italic' }}>
              Opcional — dejá vacío para colgar el ítem directo bajo {value.n1}
            </p>
          )}
        </div>
      )}

      {/* N3 — solo si el árbol lo tiene para n1+n2 elegidos */}
      {value.n1 && value.n2 && hasN3 && (
        <div>
          <label style={lbl}>Subcategoría</label>
          <select
            value={value.n3 || ''}
            onChange={e => onChange({ ...value, n3: e.target.value })}
            style={selStyle(!!value.n3)}
          >
            <option value="">— directo bajo "{value.n2}" —</option>
            {opts_n3.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {!value.n3 && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontStyle: 'italic' }}>
              Opcional — dejá vacío para colgar el ítem directo bajo {value.n2}
            </p>
          )}
        </div>
      )}

      {/* Resumen de la ruta elegida */}
      {value.n1 && (
        <div style={{ padding: '7px 11px', background: col.light, borderRadius: 8, border: `1px solid ${col.bg}25`, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Ruta:</span>
          {[value.n1, value.n2, value.n3].filter(Boolean).map((seg, i, arr) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 800, color: col.text }}>{seg}</span>
              {i < arr.length - 1 && <span style={{ color: col.text, opacity: 0.4 }}>›</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal crear / editar ítem ─────────────────────────────────────────────────
export function ItemFormModal({ item = null, initialNombre = '', onSave, onClose }) {
  const isEdit = !!item?.id

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

      const res  = await fetch('/api/items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
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

  const inp = {
    padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--surface2)', outline: 'none', width: '100%',
    color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 900, backdropFilter: 'blur(2px)' }} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-item-titulo"
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 901, width: 'min(480px, 95vw)', background: 'var(--surface)', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconEtiqueta size={18} color="#fff" aria-hidden="true" />
            </div>
            <div>
              <h3 id="modal-item-titulo" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEdit ? 'Editar ítem' : 'Nuevo ítem'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                n1 obligatorio · n2 y n3 opcionales
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, display: 'flex' }}>
            <IconCerrar size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <label style={lbl}>Nombre del ítem *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder='Ej: Vino, Luz, Pollo, Netflix…'
              autoFocus style={inp}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            {nombre.trim().length > 0 && nombre.trim().length < 2 && (
              <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Mínimo 2 caracteres</p>
            )}
          </div>

          <div>
            <label style={lbl}>Unidad por defecto</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label style={{ ...lbl, marginBottom: 12 }}>Categoría</label>
            <AdaptiveCascade value={cat} onChange={setCat} />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fee2e2', borderRadius: 10 }}>
              <IconAdvertencia size={16} color="#ef4444" aria-hidden="true" />
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0, alignItems: 'center' }}>
          {nombre.trim().length >= 2 && !cat.n1 && (
            <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600, flex: 1 }}>⚠ Seleccioná el Tipo (n1)</span>
          )}
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!valid || saving}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, cursor: valid && !saving ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7, background: valid ? 'var(--accent)' : 'var(--border)', color: valid ? '#fff' : 'var(--text-muted)', boxShadow: valid ? '0 4px 12px rgba(99,102,241,.35)' : 'none' }}>
            {saving
              ? <><IconSpinner size={15} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Guardando…</>
              : <><IconGuardar size={15} aria-hidden="true" /> {isEdit ? 'Guardar' : 'Crear ítem'}</>}
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

  const ruta = value ? [value.n1, value.n2, value.n3].filter(Boolean).join(' › ') : ''
  const n1Color = (N1_COLORS[value?.n1] || {}).bg || '#3b82f6'

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Ítem / Producto
      </label>

      {/* Ítem seleccionado */}
      {value && !query && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: (N1_COLORS[value.n1] || {}).light || '#eff6ff', borderRadius: 10, border: `1.5px solid ${n1Color}40` }}>
          <IconCheck size={16} color={n1Color} style={{ flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{value.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ruta}</div>
          </div>
          {value.unidad_default && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${n1Color}18`, color: n1Color, fontWeight: 700, flexShrink: 0 }}>
              {value.unidad_default}
            </span>
          )}
          <button onClick={handleClear} aria-label="Quitar ítem"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', flexShrink: 0 }}>
            <IconCerrar size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Input búsqueda */}
      {!value && (
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef} value={query} onChange={handleChange}
            onFocus={() => { setFocused(true); if (query.length >= 1) setOpen(true) }}
            placeholder='Buscá un ítem: "vino", "luz", "pollo"…'
            disabled={disabled} aria-label="Buscar ítem" aria-expanded={open}
            style={{
              width: '100%', padding: '11px 44px 11px 14px',
              border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, fontSize: 14, background: 'var(--surface)',
              color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
              boxShadow: focused ? '0 0 0 3px rgba(99,102,241,.15)' : 'none',
              transition: 'all .15s', opacity: disabled ? 0.5 : 1,
            }}
          />
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            {loading
              ? <IconSpinner size={17} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              : <IconBuscar  size={17} color="var(--text-muted)" aria-hidden="true" />}
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

          {open && (
            <div ref={panelRef} role="listbox"
              style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 600, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', maxHeight: 300, overflowY: 'auto' }}>

              {results.map(item => {
                const ruta = [item.n1, item.n2, item.n3].filter(Boolean).join(' › ')
                const c    = N1_COLORS[item.n1] || { bg: '#64748b' }
                return (
                  <button key={item.id} role="option" onClick={() => handleSelect(item)}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.bg, flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ruta}</div>
                    </div>
                    {item.unidad_default && (
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: `${c.bg}18`, color: c.bg, fontWeight: 700, flexShrink: 0 }}>
                        {item.unidad_default}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Crear nuevo */}
              <button onClick={() => { setOpen(false); setShowModal(true) }}
                style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'var(--accent-light)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, borderTop: results.length ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPlus size={14} color="#fff" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                    {query ? `Agregar "${query}" como nuevo ítem` : 'Crear nuevo ítem'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {!results.length && query ? 'Sin resultados' : 'Con categoría opcional'}
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
