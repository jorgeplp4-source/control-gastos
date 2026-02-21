'use client'
import { useState } from 'react'
import { CSV_CATEGORIES, UNITS, N1_COLORS, uniq } from '../lib/constants'

export default function ExpenseForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const blank = { n1: '', n2: '', n3: '', n4: '', cantidad: '', unidad: 'unidad', monto: '', fecha: today, observaciones: '' }
  const [form, setForm] = useState(initial ? { ...initial } : blank)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v }
    if (k === 'n1') { next.n2 = ''; next.n3 = ''; next.n4 = '' }
    if (k === 'n2') { next.n3 = ''; next.n4 = '' }
    if (k === 'n3') { next.n4 = '' }
    return next
  })

  const opts_n1 = uniq(CSV_CATEGORIES.map(c => c.n1))
  const opts_n2 = uniq(CSV_CATEGORIES.filter(c => c.n1 === form.n1).map(c => c.n2))
  const opts_n3 = uniq(CSV_CATEGORIES.filter(c => c.n1 === form.n1 && c.n2 === form.n2).map(c => c.n3))
  const opts_n4 = uniq(CSV_CATEGORIES.filter(c => c.n1 === form.n1 && c.n2 === form.n2 && c.n3 === form.n3).map(c => c.n4))

  const valid = form.n1 && form.n2 && form.n3 && form.n4 && form.cantidad && form.monto && form.fecha
  const activeColor = (N1_COLORS[form.n1] || {}).bg || '#3b82f6'

  const handleSubmit = async () => {
    if (!valid || saving) return
    setSaving(true)
    await onSave({ ...form, cantidad: parseFloat(form.cantidad), monto: parseFloat(form.monto), ...(initial ? { id: initial.id } : {}) })
    setSaving(false)
  }

  const inp = { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#fff', outline: 'none', width: '100%', color: '#1a2332', fontFamily: 'inherit' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }
  const selStyle = { ...inp, cursor: 'pointer', appearance: 'none', paddingRight: 28, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="card" style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
        <div style={{ height: 5, background: `linear-gradient(90deg,${activeColor},${activeColor}88)` }} />
        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{initial ? '✏️ Editar Gasto' : '➕ Nuevo Gasto'}</h2>
            {initial && <button onClick={onCancel} style={{ border: 'none', background: 'none', color: '#94a3b8', fontSize: 22 }}>✕</button>}
          </div>

          {/* CASCADE */}
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: 20, marginBottom: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>🏷️ Categorización jerárquica (4 niveles)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 12 }}>
              {[
                { label: 'Nivel 1 · Tipo', key: 'n1', opts: opts_n1, disabled: false },
                { label: 'Nivel 2 · Área', key: 'n2', opts: opts_n2, disabled: !form.n1 },
                { label: 'Nivel 3 · Subcategoría', key: 'n3', opts: opts_n3, disabled: !form.n2 },
                { label: 'Nivel 4 · Ítem', key: 'n4', opts: opts_n4, disabled: !form.n3 },
              ].map(({ label, key, opts, disabled }) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <select value={form[key]} onChange={e => set(key, e.target.value)} disabled={disabled}
                    style={{ ...selStyle, background: disabled ? '#f1f5f9' : '#fff', color: form[key] ? '#1a2332' : '#94a3b8', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                    <option value="">Seleccionar…</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {form.n1 && (
              <div style={{ marginTop: 14, padding: '7px 14px', background: (N1_COLORS[form.n1] || {}).light || '#eff6ff', borderRadius: 8, fontSize: 12, fontWeight: 600, color: (N1_COLORS[form.n1] || {}).text || '#3b82f6', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {[form.n1, form.n2, form.n3, form.n4].filter(Boolean).map((x, i, arr) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{x}{i < arr.length - 1 && <span style={{ opacity: 0.4 }}>›</span>}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 16 }}>
            <div><label style={lbl}>Cantidad</label><input type="number" min="0" step="0.01" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} placeholder="0" style={inp} /></div>
            <div><label style={lbl}>Unidad</label><select value={form.unidad} onChange={e => set('unidad', e.target.value)} style={selStyle}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
            <div><label style={lbl}>Monto ($)</label><input type="number" min="0" step="1" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0" style={inp} /></div>
            <div><label style={lbl}>Fecha</label><input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} /></div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={lbl}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas adicionales…" rows={2} style={{ ...inp, resize: 'vertical' }} />
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {initial && <button onClick={onCancel} style={{ padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, color: '#64748b' }}>Cancelar</button>}
            <button onClick={handleSubmit} disabled={!valid || saving}
              style={{ padding: '11px 32px', borderRadius: 10, border: 'none', cursor: valid && !saving ? 'pointer' : 'not-allowed', background: valid ? `linear-gradient(135deg,${activeColor},${activeColor}bb)` : '#e2e8f0', color: valid ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 800, boxShadow: valid ? `0 4px 14px ${activeColor}44` : 'none' }}>
              {saving ? 'Guardando…' : initial ? '💾 Guardar Cambios' : '✅ Registrar Gasto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
