'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { N1_COLORS, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import {
  IconBuscar, IconEtiquetas, IconCascada, IconCerrar, IconArrowRight,
  IconSinResultado, IconSpinner,
} from '../lib/icons'

function highlight(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fef08a', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function CategorySearch({ value = {}, onChange }) {
  const { categories, loading } = useCategories()
  const [mode, setMode]       = useState('search')
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const selected = value.n1 && value.n4

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          inputRef.current  && !inputRef.current.contains(e.target)) {
        setOpen(false); setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return categories.filter(p =>
      p.n1.toLowerCase().includes(q) || p.n2.toLowerCase().includes(q) ||
      p.n3.toLowerCase().includes(q) || p.n4.toLowerCase().includes(q)
    ).slice(0, 12)
  }, [query, categories])

  const handleSelect = (r) => {
    onChange({ n1: r.n1, n2: r.n2, n3: r.n3, n4: r.n4 })
    setQuery(''); setOpen(false); setFocused(false)
  }

  // ── Cascada — opciones derivadas de categories ────────────────────────────
  const opts_n1 = useMemo(() => uniq(categories.map(c => c.n1)), [categories])
  const opts_n2 = useMemo(() => value.n1 ? uniq(categories.filter(c => c.n1 === value.n1).map(c => c.n2)) : [], [value.n1, categories])
  const opts_n3 = useMemo(() => value.n2 ? uniq(categories.filter(c => c.n1 === value.n1 && c.n2 === value.n2).map(c => c.n3)) : [], [value.n1, value.n2, categories])
  const opts_n4 = useMemo(() => value.n3 ? uniq(categories.filter(c => c.n1 === value.n1 && c.n2 === value.n2 && c.n3 === value.n3).map(c => c.n4)) : [], [value.n1, value.n2, value.n3, categories])

  const selStyle  = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }
  const activeColor = value.n1 ? (N1_COLORS[value.n1] || {}).bg || 'var(--accent)' : 'var(--accent)'

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <IconEtiquetas size={14} aria-hidden="true" />
          Categorización (4 niveles)
          {loading && <IconSpinner size={13} style={{ animation: 'spin 1s linear infinite', marginLeft: 4 }} aria-hidden="true" />}
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { id: 'search',  label: 'Búsqueda', Icon: IconBuscar  },
            { id: 'cascade', label: 'Cascada',  Icon: IconCascada },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
              style={{ padding: '5px 12px', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: mode === m.id ? 'var(--accent)' : 'var(--surface)', color: mode === m.id ? '#fff' : 'var(--text-muted)', transition: 'all .15s' }}>
              <m.Icon size={12} aria-hidden="true" />
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* MODO BÚSQUEDA */}
      {mode === 'search' && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              placeholder={selected ? '' : 'Escribí: "pollo", "electricidad", "netflix"…'}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => { setFocused(true); setOpen(true) }}
              aria-label="Buscar categoría"
              aria-autocomplete="list"
              aria-expanded={open}
              disabled={loading}
              style={{
                width: '100%', padding: '11px 44px 11px 14px',
                border: `1.5px solid ${focused ? activeColor : 'var(--border)'}`,
                borderRadius: 12, fontSize: 14, background: 'var(--surface)',
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
                boxShadow: focused ? `0 0 0 3px ${activeColor}22` : 'none', transition: 'all .15s',
                opacity: loading ? 0.6 : 1,
              }}
            />
            <IconBuscar size={18} color="var(--text-muted)" aria-hidden="true"
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Selección actual */}
          {selected && !query && (
            <div style={{ marginTop: 8, padding: '8px 14px', background: (N1_COLORS[value.n1] || {}).light || '#eff6ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', fontSize: 12, fontWeight: 600, color: (N1_COLORS[value.n1] || {}).text || '#3b82f6' }}>
                {[value.n1, value.n2, value.n3, value.n4].filter(Boolean).map((x, i, arr) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {x}{i < arr.length - 1 && <span style={{ opacity: 0.4 }}>›</span>}
                  </span>
                ))}
              </div>
              <button onClick={() => { onChange({ n1: '', n2: '', n3: '', n4: '' }); setQuery('') }}
                aria-label="Limpiar selección"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <IconCerrar size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Dropdown */}
          {open && !loading && (
            <div ref={panelRef} role="listbox" aria-label="Resultados de búsqueda"
              style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', marginTop: 4, maxHeight: 340, overflowY: 'auto' }}>

              {/* Accesos rápidos */}
              {query.length < 2 && (
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', fontWeight: 600 }}>Accesos rápidos</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Pollo', 'Pan', 'Electricidad', 'Gas', 'Netflix', 'Farmacia', 'Nafta', 'Verduras'].map(q => (
                      <button key={q} onClick={() => { setQuery(q); inputRef.current?.focus() }}
                        style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sin resultados */}
              {query.length >= 2 && results.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <IconSinResultado size={32} style={{ marginBottom: 6 }} aria-hidden="true" />
                  <p style={{ fontSize: 13, margin: 0 }}>Sin resultados para "<strong>{query}</strong>"</p>
                  <button onClick={() => setMode('cascade')}
                    style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Buscar en cascada <IconArrowRight size={12} aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Resultados */}
              {results.map((r, i) => {
                const c = N1_COLORS[r.n1] || { bg: '#64748b', light: 'var(--surface2)', text: '#64748b' }
                return (
                  <button key={r.n4_id || i} role="option" onClick={() => handleSelect(r)}
                    style={{ width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--border)', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.bg, flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{highlight(r.n4, query)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {highlight(r.n1, query)} › {highlight(r.n2, query)} › {highlight(r.n3, query)}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: c.bg + '18', color: c.bg, flexShrink: 0 }}>{r.n1}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODO CASCADA */}
      {mode === 'cascade' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'n1', label: 'Tipo',         opts: opts_n1, placeholder: 'Fijos, Variables…' },
            { key: 'n2', label: 'Área',          opts: opts_n2, placeholder: 'Elegí primero el Tipo',         disabled: !value.n1 },
            { key: 'n3', label: 'Subcategoría',  opts: opts_n3, placeholder: 'Elegí primero el Área',         disabled: !value.n2 },
            { key: 'n4', label: 'Ítem',          opts: opts_n4, placeholder: 'Elegí primero Subcategoría',    disabled: !value.n3 },
          ].map(({ key, label, opts, placeholder, disabled }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</label>
              <select
                value={value[key] || ''}
                disabled={disabled || opts.length === 0 || loading}
                onChange={e => {
                  const v = e.target.value
                  if (key === 'n1') onChange({ n1: v, n2: '', n3: '', n4: '' })
                  if (key === 'n2') onChange({ ...value, n2: v, n3: '', n4: '' })
                  if (key === 'n3') onChange({ ...value, n3: v, n4: '' })
                  if (key === 'n4') onChange({ ...value, n4: v })
                }}
                style={{ ...selStyle, opacity: (disabled || loading) ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                <option value="">{loading ? 'Cargando…' : placeholder}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
