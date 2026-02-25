'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { UNITS, N1_COLORS, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import {
  IconBuscar, IconCerrar, IconPlus, IconCheck,
  IconGuardar, IconSpinner, IconEtiqueta, IconAdvertencia,
} from '../lib/icons'

/**
 * ItemSearch — busca ítems guardados. Al crear uno nuevo, la categoría
 * se elige SOLO por cascada de 3 niveles (sin búsqueda libre de categoría).
 */
export default function ItemSearch({ value, onChange, onUnitChange, disabled }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [focused, setFocused]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  const debounce = useRef(null)

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handler(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        inputRef.current  && !inputRef.current.contains(e.target)
      ) { setOpen(false); setFocused(false) }
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

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    if (q.length >= 1) search(q)
    else { setResults([]); setOpen(false) }
  }

  const handleSelect = (item) => {
    onChange(item)
    if (item.unidad_default) onUnitChange?.(item.unidad_default)
    setQuery(''); setOpen(false); setFocused(false)
  }

  const handleClear = () => {
    onChange(null); onUnitChange?.(null)
    setQuery(''); setResults([])
  }

  const n1Color = value?.n1 ? (N1_COLORS[value.n1] || {}).bg || '#3b82f6' : '#3b82f6'

  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        Ítem / Producto
      </label>

      {/* Ítem seleccionado */}
      {value && !query && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:(N1_COLORS[value.n1]||{}).light||'#eff6ff', borderRadius:10, border:`1.5px solid ${n1Color}40` }}>
          <IconCheck size={16} color={n1Color} aria-hidden="true" />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{value.nombre}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              {[value.n1, value.n2, value.n3].filter(Boolean).join(' › ')}
            </div>
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

      {/* Input búsqueda */}
      {!value && (
        <div style={{ position:'relative' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onFocus={() => { setFocused(true); if (query.length >= 1) setOpen(true) }}
            placeholder='Buscá un ítem: "pollo", "nafta", "detergente"…'
            disabled={disabled}
            aria-label="Buscar ítem"
            aria-autocomplete="list"
            aria-expanded={open}
            style={{
              width:'100%', padding:'11px 44px 11px 14px',
              border:`1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius:10, fontSize:14, background:'var(--surface)',
              color:'var(--text-primary)', outline:'none', fontFamily:'inherit',
              boxSizing:'border-box',
              boxShadow: focused ? '0 0 0 3px rgba(99,102,241,.15)' : 'none',
              transition:'all .15s', opacity: disabled ? 0.5 : 1,
            }}
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

              {results.map((item) => {
                const c = N1_COLORS[item.n1] || { bg:'#64748b' }
                return (
                  <button key={item.id} role="option" onClick={() => handleSelect(item)}
                    style={{ width:'100%', padding:'10px 14px', border:'none', borderBottom:'1px solid var(--border)', background:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c.bg, flexShrink:0 }} aria-hidden="true" />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{item.nombre}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {[item.n1, item.n2, item.n3].filter(Boolean).join(' › ')}
                      </div>
                    </div>
                    {item.unidad_default && (
                      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99, background:`${c.bg}18`, color:c.bg, fontWeight:700, flexShrink:0 }}>
                        {item.unidad_default}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Crear nuevo */}
              <button onClick={() => { setOpen(false); setShowModal(true) }}
                style={{ width:'100%', padding:'11px 14px', border:'none', background:'var(--accent-light)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, borderTop: results.length ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <IconPlus size={14} color="#fff" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>
                    {query ? `Agregar "${query}" como nuevo ítem` : 'Crear nuevo ítem'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {results.length === 0 && query ? 'Sin resultados — creá uno nuevo' : 'Con categoría y unidad'}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CreateItemModal
          initialNombre={query}
          onSave={(item) => { handleSelect(item); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ── Modal crear ítem — SOLO cascada de 3 niveles ──────────────────────────────
export function CreateItemModal({ initialNombre = '', onSave, onClose, initialN1='', initialN2='', initialN3='' }) {
  const { categories } = useCategories()
  const [nombre, setNombre] = useState(initialNombre)
  const [unidad, setUnidad] = useState('unidad')
  const [n1, setN1] = useState(initialN1)
  const [n2, setN2] = useState(initialN2)
  const [n3, setN3] = useState(initialN3)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const opts_n1 = useMemo(() => uniq(categories.map(c => c.n1)), [categories])
  const opts_n2 = useMemo(() => n1 ? uniq(categories.filter(c => c.n1 === n1).map(c => c.n2)) : [], [categories, n1])
  const opts_n3 = useMemo(() => n2 ? uniq(categories.filter(c => c.n1 === n1 && c.n2 === n2).map(c => c.n3)) : [], [categories, n1, n2])

  const catSelected = n1 && n2 && n3
  const valid = nombre.trim().length >= 2 && catSelected

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), n1, n2, n3, unidad_default: unidad }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSave(data)
    } catch (e) { setError(e.message); setSaving(false) }
  }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface2)', outline:'none', width:'100%', color:'var(--text-primary)', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:900, backdropFilter:'blur(2px)' }} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-item-titulo"
        style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:901, width:'min(500px, 95vw)', background:'var(--surface)', borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,.25)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IconEtiqueta size={18} color="#fff" aria-hidden="true" />
            </div>
            <div>
              <h3 id="modal-item-titulo" style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>Nuevo ítem</h3>
              <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>Nombre + categoría obligatorios</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:6, display:'flex', borderRadius:8 }}>
            <IconCerrar size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:18 }}>

          {/* Nombre */}
          <div>
            <label style={lbl}>Nombre del ítem *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder='Ej: Pechuga de pollo, Gas natural, Netflix…'
              autoFocus style={inp}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            {nombre.trim().length > 0 && nombre.trim().length < 2 && (
              <p style={{ fontSize:11, color:'#ef4444', margin:'4px 0 0' }}>Mínimo 2 caracteres</p>
            )}
          </div>

          {/* Categoría — solo cascada */}
          <div>
            <label style={{ ...lbl, marginBottom:12 }}>Categoría (3 niveles) *</label>

            {/* Selección actual */}
            {catSelected && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:(N1_COLORS[n1]||{}).light||'#eff6ff', borderRadius:8, marginBottom:12, flexWrap:'wrap' }}>
                {[n1, n2, n3].map((x, i) => (
                  <span key={i} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:(N1_COLORS[n1]||{}).text||'#3b82f6' }}>
                    {x}{i < 2 && <span style={{ opacity:.4 }}>›</span>}
                  </span>
                ))}
                <button onClick={() => { setN1(''); setN2(''); setN3('') }} style={{ marginLeft:'auto', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2 }}>
                  <IconCerrar size={12} aria-hidden="true" />
                </button>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { label:'Tipo',         val:n1, opts:opts_n1, onChg: v => { setN1(v); setN2(''); setN3('') }, dis:false },
                { label:'Área',         val:n2, opts:opts_n2, onChg: v => { setN2(v); setN3('') },           dis:!n1   },
                { label:'Subcategoría', val:n3, opts:opts_n3, onChg: v => setN3(v),                          dis:!n2   },
              ].map(({ label, val, opts, onChg, dis }) => (
                <div key={label}>
                  <label style={{ ...lbl, marginBottom:4, fontSize:10 }}>{label}</label>
                  <select value={val} onChange={e => onChg(e.target.value)}
                    disabled={dis || opts.length === 0}
                    style={{ ...inp, cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.5 : 1 }}>
                    <option value="">— elegí —</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Unidad */}
          <div>
            <label style={lbl}>Unidad por defecto</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)}
              style={{ ...inp, cursor:'pointer' }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#fee2e2', borderRadius:10 }}>
              <IconAdvertencia size={16} color="#ef4444" aria-hidden="true" />
              <span style={{ fontSize:13, color:'#dc2626', fontWeight:600 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', padding:'16px 24px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0, alignItems:'center' }}>
          {nombre.trim().length >= 2 && !catSelected && (
            <span style={{ fontSize:12, color:'#d97706', fontWeight:600, flex:1 }}>
              ⚠ Seleccioná los 3 niveles
            </span>
          )}
          <button onClick={onClose}
            style={{ padding:'10px 20px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:13, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!valid || saving}
            style={{ padding:'10px 24px', borderRadius:10, border:'none', fontSize:13, fontWeight:800, cursor: valid && !saving ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:7, background: valid ? 'var(--accent)' : 'var(--border)', color: valid ? '#fff' : 'var(--text-muted)', boxShadow: valid ? '0 4px 12px rgba(99,102,241,.35)' : 'none' }}>
            {saving
              ? <><IconSpinner size={15} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" /> Guardando…</>
              : <><IconGuardar size={15} aria-hidden="true" /> Crear ítem</>}
          </button>
        </div>
      </div>
    </>
  )
}
