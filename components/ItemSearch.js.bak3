'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { N1_COLORS } from '../lib/constants'
import { useUnits } from '../lib/useUnits'
import { useCategories } from '../lib/useCategories'
import {
  IconBuscar, IconCerrar, IconPlus, IconCheck,
  IconSpinner, IconEtiqueta, IconAdvertencia, IconGuardar,
} from '../lib/icons'

// ── Constantes ────────────────────────────────────────────────────────────────
const N1_ORDEN = ['Variables', 'Fijos', 'Extraordinarios', 'Imprevistos']

// ─────────────────────────────────────────────────────────────────────────────
//  QUICK CREATE MODAL — stepper de 4 pasos (N1 → N2 → N3 → Confirmar)
//  Reemplaza al viejo ItemFormModal / TreeCategoryPicker
// ─────────────────────────────────────────────────────────────────────────────
export function ItemFormModal({ item = null, initialNombre = '', onSave, onClose }) {
  const isEdit = !!item?.id
  const { units }      = useUnits()
  const { categories, refetch } = useCategories()

  // ── Estado del stepper ────────────────────────────────────────────────────
  const STEPS = isEdit ? ['Nombre', 'Categoría', 'Confirmar'] : ['Nombre', 'Tipo', 'Área / Sub.', 'Confirmar']
  const [step,    setStep]    = useState(0)   // 0-based
  const [nombre,  setNombre]  = useState(item?.nombre || initialNombre)
  const [unidad,  setUnidad]  = useState(item?.unidad_default || 'unidad')
  const [n1,      setN1]      = useState(item?.n1 || '')
  const [n2,      setN2]      = useState(item?.n2 || '')
  const [n3,      setN3]      = useState(item?.n3 || '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [creating, setCreating] = useState(null) // 'n1'|'n2'|'n3' — inline create cat
  const [newCatNombre, setNewCatNombre] = useState('')
  const [creatingCat, setCreatingCat]   = useState(false)

  // ── Opciones derivadas del árbol real ─────────────────────────────────────
  const n1Opts = useMemo(() => {
    const seen = new Set()
    return categories.filter(r => r.n1 && !seen.has(r.n1) && seen.add(r.n1))
      .map(r => ({ id: r.n1_id, nombre: r.n1 }))
      .sort((a, b) => {
        const ia = N1_ORDEN.indexOf(a.nombre), ib = N1_ORDEN.indexOf(b.nombre)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1; if (ib !== -1) return 1
        return a.nombre.localeCompare(b.nombre, 'es')
      })
  }, [categories])

  const n2Opts = useMemo(() => {
    if (!n1) return []
    const seen = new Set()
    return categories.filter(r => r.n1 === n1 && r.n2 && !seen.has(r.n2) && seen.add(r.n2))
      .map(r => ({ id: r.n2_id, nombre: r.n2 }))
  }, [categories, n1])

  const n3Opts = useMemo(() => {
    if (!n1 || !n2) return []
    const seen = new Set()
    return categories.filter(r => r.n1 === n1 && r.n2 === n2 && r.n3 && !seen.has(r.n3) && seen.add(r.n3))
      .map(r => ({ id: r.n3_id, nombre: r.n3 }))
  }, [categories, n1, n2])

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // ── Crear categoría inline ────────────────────────────────────────────────
  const handleCreateCat = async (nivel, parentId) => {
    if (!newCatNombre.trim() || creatingCat) return
    setCreatingCat(true)
    const res = await fetch('/api/categorias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newCatNombre.trim(), nivel, parent_id: parentId || null }),
    })
    const data = await res.json()
    setCreatingCat(false)
    if (!res.ok) { setError(data.error || 'Error al crear'); return }
    refetch()
    // Seleccionar la nueva categoría automáticamente
    if (nivel === 1) { setN1(newCatNombre.trim()); setN2(''); setN3('') }
    if (nivel === 2) { setN2(newCatNombre.trim()); setN3('') }
    if (nivel === 3) { setN3(newCatNombre.trim()) }
    setNewCatNombre(''); setCreating(null)
  }

  // ── Guardar ítem ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!nombre.trim() || saving) return
    setSaving(true); setError('')
    try {
      const body = { nombre: nombre.trim(), unidad_default: unidad, n1: n1 || null, n2: n2 || null, n3: n3 || null }
      if (isEdit) body.id = item.id
      const res  = await fetch('/api/items', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSave(data)
    } catch (e) { setError(e.message); setSaving(false) }
  }

  const c      = N1_COLORS[n1] || { bg: '#64748b', light: 'var(--surface2)', text: '#64748b' }
  const total  = STEPS.length
  const isLast = step === total - 1

  // ── Pasos auto-skip ───────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 0 && !nombre.trim()) return
    if (isLast) { handleSave(); return }
    // En modo edición: paso 1 = categoría (sin separar N1/N2/N3 en pasos)
    setStep(s => Math.min(s + 1, total - 1))
  }
  const goBack = () => setStep(s => Math.max(s - 1, 0))

  // ── Helpers UI ────────────────────────────────────────────────────────────
  const S = {
    inp: { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' },
    pill: (active, accentColor) => ({
      padding: '8px 14px', border: `1.5px solid ${active ? (accentColor || 'var(--accent)') : 'var(--border)'}`,
      borderRadius: 99, background: active ? `${accentColor || 'var(--accent)'}18` : 'var(--surface2)',
      color: active ? (accentColor || 'var(--accent)') : 'var(--text-secondary)',
      fontFamily: 'inherit', fontSize: 12, fontWeight: active ? 700 : 500,
      cursor: 'pointer', transition: 'all .12s', display: 'inline-flex', alignItems: 'center', gap: 5,
    }),
    lbl: { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7 },
  }

  const InlineCreateCat = ({ nivel, parentId, placeholder }) => (
    <div style={{ padding: '8px 10px', background: 'var(--accent-light, #eff6ff)', border: '1.5px solid var(--accent)', borderRadius: 9, marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 5 }}>
        + Nueva categoría nivel {nivel}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <input value={newCatNombre} onChange={e => setNewCatNombre(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreateCat(nivel, parentId); if (e.key === 'Escape') setCreating(null) }}
          placeholder={placeholder} autoFocus
          style={{ ...S.inp, flex: 1, padding: '5px 9px' }} />
        <button onClick={() => handleCreateCat(nivel, parentId)} disabled={!newCatNombre.trim() || creatingCat}
          style={{ padding: '5px 12px', border: 'none', borderRadius: 7, background: newCatNombre.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: newCatNombre.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
          {creatingCat ? '…' : 'Crear'}
        </button>
        <button onClick={() => { setCreating(null); setNewCatNombre('') }}
          style={{ padding: '5px 9px', border: 'none', borderRadius: 7, background: 'var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <IconCerrar size={12} />
        </button>
      </div>
    </div>
  )

  // ── Renderizar body de cada paso ──────────────────────────────────────────
  const renderStep = () => {
    // Paso 0: Nombre + Unidad
    if (step === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={S.lbl}>Nombre del ítem *</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder='Ej: Vino, Luz, Netflix…' autoFocus
            onKeyDown={e => e.key === 'Enter' && nombre.trim() && goNext()}
            style={{ ...S.inp, fontSize: 15, fontWeight: 600, padding: '11px 14px' }} />
          {nombre.trim().length > 0 && nombre.trim().length < 2 &&
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#ef4444' }}>Mínimo 2 caracteres</p>}
        </div>
        <div>
          <label style={S.lbl}>Unidad por defecto</label>
          <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{ ...S.inp, cursor: 'pointer' }}>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
    )

    // Paso 1 (edit) / 1 (create) — Tipo N1
    if ((!isEdit && step === 1) || (isEdit && step === 1)) return (
      <div>
        <label style={S.lbl}>Tipo de gasto (N1)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {n1Opts.map(opt => {
            const cc = N1_COLORS[opt.nombre] || { bg: '#64748b' }
            return (
              <button key={opt.id} onClick={() => { setN1(opt.nombre); setN2(''); setN3('') }}
                style={S.pill(n1 === opt.nombre, cc.bg)}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cc.bg, flexShrink: 0 }} />
                {opt.nombre}
                {n1 === opt.nombre && <IconCheck size={11} />}
              </button>
            )
          })}
        </div>

        {/* Inline create N1 */}
        {creating === 'n1' ? (
          <InlineCreateCat nivel={1} parentId={null} placeholder="Nombre del tipo…" />
        ) : (
          <button onClick={() => setCreating('n1')} style={{ marginTop: 10, ...S.pill(false), color: 'var(--accent)', borderStyle: 'dashed' }}>
            <IconPlus size={11} />+ Crear nuevo tipo
          </button>
        )}

        <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          Opcional → <span onClick={() => { setN1(''); setStep(isEdit ? 2 : 3) }} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>saltar sin asignar</span>
        </p>
      </div>
    )

    // Paso 2 (create) — Área N2 + Subcategoría N3 juntos
    if (!isEdit && step === 2) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* N2 */}
        <div>
          <label style={S.lbl}>Área (N2) — {n1 || 'sin tipo'}</label>
          {n2Opts.length === 0 && !n1 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Seleccioná un Tipo en el paso anterior para ver las áreas disponibles.</p>
          ) : n2Opts.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{n1}" no tiene áreas definidas.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {n2Opts.map(opt => (
                <button key={opt.id} onClick={() => { setN2(opt.nombre); setN3('') }}
                  style={S.pill(n2 === opt.nombre, c.bg)}>
                  {opt.nombre}
                  {n2 === opt.nombre && <IconCheck size={11} />}
                </button>
              ))}
            </div>
          )}
          {n1 && (
            creating === 'n2' ? <InlineCreateCat nivel={2} parentId={n1Opts.find(o=>o.nombre===n1)?.id} placeholder="Nombre del área…" />
            : <button onClick={() => setCreating('n2')} style={{ marginTop: 8, ...S.pill(false), color: 'var(--accent)', borderStyle: 'dashed' }}><IconPlus size={11} />+ Nueva área</button>
          )}
          {n2 && <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span onClick={() => setN2('')} style={{ cursor:'pointer', color:'var(--accent)', fontWeight:600 }}>Quitar área</span>
          </p>}
        </div>

        {/* N3 */}
        {n2 && (
          <div>
            <label style={S.lbl}>Subcategoría (N3) — {n2}</label>
            {n3Opts.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {n3Opts.map(opt => (
                  <button key={opt.id} onClick={() => setN3(opt.nombre)}
                    style={S.pill(n3 === opt.nombre, c.bg)}>
                    {opt.nombre}
                    {n3 === opt.nombre && <IconCheck size={11} />}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{n2}" no tiene subcategorías.</p>
            )}
            {creating === 'n3' ? <InlineCreateCat nivel={3} parentId={n2Opts.find(o=>o.nombre===n2)?.id} placeholder="Nombre de subcategoría…" />
            : <button onClick={() => setCreating('n3')} style={{ marginTop: 8, ...S.pill(false), color: 'var(--accent)', borderStyle: 'dashed' }}><IconPlus size={11} />+ Nueva subcategoría</button>}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Todos los niveles son opcionales. <span onClick={() => setStep(3)} style={{ cursor:'pointer', color:'var(--accent)', fontWeight:600 }}>Saltar al resumen →</span>
        </p>
      </div>
    )

    // Último paso — Confirmar
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={S.lbl}>Resumen</label>
        <div style={{ padding: '14px 16px', background: c.light, borderRadius: 10, border: `1.5px solid ${c.bg}30`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📦</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{nombre}</span>
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: `${c.bg}20`, color: c.bg, fontWeight: 700, marginLeft: 4 }}>{unidad}</span>
          </div>
          {n1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍</span>
              {[n1, n2, n3].filter(Boolean).map((seg, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{seg}</span>
                  {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>›</span>}
                </span>
              ))}
            </div>
          )}
          {!n1 && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin categoría asignada</p>}
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: '#fee2e2', borderRadius: 8 }}>
            <IconAdvertencia size={14} color="#ef4444" />
            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</span>
          </div>
        )}
      </div>
    )
  }

  const canNext = step === 0 ? nombre.trim().length >= 2 : true

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, backdropFilter: 'blur(2px)' }} aria-hidden="true" />
      <div role="dialog" aria-modal="true"
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 901, width: 'min(460px,96vw)', background: 'var(--surface)', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconEtiqueta size={16} color="#fff" aria-hidden="true" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEdit ? 'Editar ítem' : nombre ? `"${nombre}"` : 'Nuevo ítem'}
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Paso {step + 1} de {total}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 5, display: 'flex' }}>
            <IconCerrar size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Stepper visual */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: i < step ? 'pointer' : 'default' }}
                  onClick={() => i < step && setStep(i)}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, transition: 'all .2s',
                    background: i < step ? 'var(--accent)' : i === step ? 'var(--accent)' : 'var(--border)',
                    color: i <= step ? '#fff' : 'var(--text-muted)',
                    boxShadow: i === step ? '0 0 0 3px rgba(99,102,241,.2)' : 'none',
                  }}>
                    {i < step ? <IconCheck size={11} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--accent)' : i < step ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {s}
                  </span>
                </div>
                {i < total - 1 && (
                  <div style={{ flex: 1, height: 1, background: i < step ? 'var(--accent)' : 'var(--border)', margin: '0 6px', transition: 'background .2s' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {renderStep()}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Cancelar
            </button>
            {step > 0 && (
              <button onClick={goBack} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ← Atrás
              </button>
            )}
          </div>
          <button onClick={goNext} disabled={!canNext || saving}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 800, cursor: canNext && !saving ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, background: canNext ? 'var(--accent)' : 'var(--border)', color: canNext ? '#fff' : 'var(--text-muted)', boxShadow: canNext ? '0 4px 12px rgba(99,102,241,.3)' : 'none', transition: 'all .15s' }}>
            {saving
              ? <><IconSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando…</>
              : isLast
                ? <><IconGuardar size={14} /> {isEdit ? 'Guardar' : 'Crear ítem'}</>
                : <>Siguiente →</>}
          </button>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )
}

// Alias
export const CreateItemModal = (props) => <ItemFormModal {...props} />

// ── ItemSearch (sin cambios en la búsqueda, solo usa nuevo modal) ─────────────
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
    const q = e.target.value; setQuery(q)
    q.length >= 1 ? search(q) : (setResults([]), setOpen(false))
  }
  const handleSelect = item => {
    onChange(item); onUnitChange?.(item.unidad_default)
    setQuery(''); setOpen(false); setFocused(false)
  }
  const handleClear = () => {
    onChange(null); onUnitChange?.(null); setQuery(''); setResults([])
  }

  const ruta    = value ? [value.n1, value.n2, value.n3].filter(Boolean).join(' › ') : ''
  const n1Color = (N1_COLORS[value?.n1] || {}).bg || '#3b82f6'

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Ítem / Producto
      </label>

      {value && !query && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: (N1_COLORS[value.n1] || {}).light || '#eff6ff', borderRadius: 10, border: `1.5px solid ${n1Color}40` }}>
          <IconCheck size={15} color={n1Color} style={{ flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{value.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{ruta}</div>
          </div>
          {value.unidad_default && (
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: `${n1Color}18`, color: n1Color, fontWeight: 700, flexShrink: 0 }}>{value.unidad_default}</span>
          )}
          <button onClick={handleClear} aria-label="Quitar ítem"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', flexShrink: 0 }}>
            <IconCerrar size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {!value && (
        <div style={{ position: 'relative' }}>
          <input ref={inputRef} value={query} onChange={handleChange}
            onFocus={() => { setFocused(true); if (query.length >= 1) setOpen(true) }}
            placeholder='Buscá un ítem: "vino", "luz", "pollo"…'
            disabled={disabled} aria-label="Buscar ítem" aria-expanded={open}
            style={{ width: '100%', padding: '11px 44px 11px 14px', border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', boxShadow: focused ? '0 0 0 3px rgba(99,102,241,.15)' : 'none', transition: 'all .15s', opacity: disabled ? 0.5 : 1 }} />
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            {loading
              ? <IconSpinner size={16} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              : <IconBuscar  size={16} color="var(--text-muted)" aria-hidden="true" />}
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

          {open && (
            <div ref={panelRef} role="listbox"
              style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 600, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg,0 8px 32px rgba(0,0,0,.12))', maxHeight: 300, overflowY: 'auto' }}>

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
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: `${c.bg}18`, color: c.bg, fontWeight: 700, flexShrink: 0 }}>{item.unidad_default}</span>
                    )}
                  </button>
                )
              })}

              {/* Crear nuevo */}
              <button onClick={() => { setOpen(false); setShowModal(true) }}
                style={{ width: '100%', padding: '11px 14px', border: 'none', background: 'var(--accent-light,#eff6ff)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, borderTop: results.length ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPlus size={13} color="#fff" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                    {query ? `Crear "${query}"` : 'Crear nuevo ítem'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {!results.length && query ? 'Sin resultados · ' : ''}Asignar categoría paso a paso
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
