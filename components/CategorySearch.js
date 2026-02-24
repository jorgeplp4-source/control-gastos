'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { CSV_CATEGORIES, N1_COLORS, uniq } from '../lib/constants'

// Construye lista plana de rutas completas para búsqueda
// Cada entrada: { n1, n2, n3, n4, label, path }
const ALL_PATHS = (() => {
  const paths = []
  CSV_CATEGORIES.forEach(c => {
    if (c.n4) paths.push({ n1: c.n1, n2: c.n2, n3: c.n3, n4: c.n4 })
  })
  return paths
})()

function highlight(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fef08a', color: '#1a2332', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function CategorySearch({ value, onChange }) {
  // value = { n1, n2, n3, n4 }
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [mode, setMode] = useState('search') // 'search' | 'cascade'
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Estado cascade
  const [cascade, setCascade] = useState({ n1: value?.n1 || '', n2: value?.n2 || '', n3: value?.n3 || '', n4: value?.n4 || '' })

  const opts_n1 = useMemo(() => uniq(CSV_CATEGORIES.map(c => c.n1)), [])
  const opts_n2 = useMemo(() => uniq(CSV_CATEGORIES.filter(c => c.n1 === cascade.n1).map(c => c.n2)), [cascade.n1])
  const opts_n3 = useMemo(() => uniq(CSV_CATEGORIES.filter(c => c.n1 === cascade.n1 && c.n2 === cascade.n2).map(c => c.n3)), [cascade.n1, cascade.n2])
  const opts_n4 = useMemo(() => uniq(CSV_CATEGORIES.filter(c => c.n1 === cascade.n1 && c.n2 === cascade.n2 && c.n3 === cascade.n3).map(c => c.n4)), [cascade.n1, cascade.n2, cascade.n3])

  const setCasc = (k, v) => {
    const next = { ...cascade, [k]: v }
    if (k === 'n1') { next.n2 = ''; next.n3 = ''; next.n4 = '' }
    if (k === 'n2') { next.n3 = ''; next.n4 = '' }
    if (k === 'n3') { next.n4 = '' }
    setCascade(next)
    if (next.n1 && next.n2 && next.n3 && next.n4) onChange(next)
  }

  // Resultados de búsqueda
  const results = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    // Buscar en todos los niveles
    return ALL_PATHS.filter(p =>
      p.n1.toLowerCase().includes(q) ||
      p.n2.toLowerCase().includes(q) ||
      p.n3.toLowerCase().includes(q) ||
      p.n4.toLowerCase().includes(q)
    ).slice(0, 12)
  }, [query])

  // Cerrar dropdown al click afuera
  useEffect(() => {
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = value?.n4
  const activeColor = value?.n1 ? (N1_COLORS[value.n1] || {}).bg || '#3b82f6' : '#3b82f6'

  const selStyle = {
    padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontSize: 13, background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', width: '100%', fontFamily: 'inherit', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28,
  }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div>
      {/* HEADER con toggle de modo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          🏷️ Categorización (4 niveles)
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[{ id: 'search', label: '🔍 Búsqueda' }, { id: 'cascade', label: '≡ Cascada' }].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ padding: '5px 12px', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: mode === m.id ? 'var(--accent)' : 'var(--surface)', color: mode === m.id ? '#fff' : 'var(--text-muted)', transition: 'all .15s' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODO BÚSQUEDA */}
      {mode === 'search' && (
        <div style={{ position: 'relative' }}>
          {/* Campo de búsqueda */}
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              placeholder={selected ? '' : 'Escribí para buscar: "pollo", "electricidad", "netflix"…'}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => { setFocused(true); setOpen(true) }}
              style={{
                width: '100%', padding: '11px 44px 11px 14px', border: `1.5px solid ${focused ? activeColor : 'var(--border)'}`,
                borderRadius: 12, fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                boxShadow: focused ? `0 0 0 3px ${activeColor}22` : 'none', transition: 'all .15s',
              }}
            />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
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
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>
            </div>
          )}

          {/* Dropdown resultados */}
          {open && (
            <div ref={panelRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', marginTop: 4, maxHeight: 340, overflowY: 'auto' }}>
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

              {query.length >= 2 && results.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🤷</div>
                  <p style={{ fontSize: 13, margin: 0 }}>Sin resultados para "<strong>{query}</strong>"</p>
                  <button onClick={() => setMode('cascade')} style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Buscar manualmente →
                  </button>
                </div>
              )}

              {results.length > 0 && results.map((r, i) => {
                const c = N1_COLORS[r.n1] || { bg: '#64748b', light: 'var(--surface2)', text: '#64748b' }
                return (
                  <button key={i}
                    onClick={() => { onChange(r); setQuery(''); setOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'block', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                    {/* Ítem principal */}
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {highlight(r.n4, query)}
                    </div>
                    {/* Ruta jerárquica */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: c.light, color: c.text }}>
                        {highlight(r.n1, query)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>›</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{highlight(r.n2, query)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>›</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{highlight(r.n3, query)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODO CASCADE (selects clásicos) */}
      {mode === 'cascade' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
            {[
              { label: 'N1 · Tipo', key: 'n1', opts: opts_n1, disabled: false },
              { label: 'N2 · Área', key: 'n2', opts: opts_n2, disabled: !cascade.n1 },
              { label: 'N3 · Subcategoría', key: 'n3', opts: opts_n3, disabled: !cascade.n2 },
              { label: 'N4 · Ítem', key: 'n4', opts: opts_n4, disabled: !cascade.n3 },
            ].map(({ label, key, opts, disabled }) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <select value={cascade[key]} onChange={e => setCasc(key, e.target.value)} disabled={disabled}
                  style={{ ...selStyle, background: disabled ? 'var(--surface2)' : 'var(--surface)', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  <option value="">Seleccionar…</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          {cascade.n1 && (
            <div style={{ marginTop: 10, padding: '7px 14px', background: (N1_COLORS[cascade.n1] || {}).light || '#eff6ff', borderRadius: 8, fontSize: 12, fontWeight: 600, color: (N1_COLORS[cascade.n1] || {}).text || '#3b82f6', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              {[cascade.n1, cascade.n2, cascade.n3, cascade.n4].filter(Boolean).map((x, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {x}{i < arr.length - 1 && <span style={{ opacity: 0.4 }}>›</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
