'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'
import { useApp } from '../context/AppContext'
import { CSV_CATEGORIES, uniq } from '../lib/constants'

const FRECUENCIAS = [
  { val: 'diaria',    label: 'Diaria',        icon: '📅' },
  { val: 'semanal',   label: 'Semanal',        icon: '📆' },
  { val: 'quincenal', label: 'Quincenal',      icon: '🗓️' },
  { val: 'mensual',   label: 'Mensual',        icon: '📋' },
  { val: 'custom',    label: 'Personalizado',  icon: '⚙️' },
]

function calcProxima(r) {
  if (!r.activo) return null
  const base = r.ultimo_proceso ? new Date(r.ultimo_proceso) : new Date(r.fecha_inicio)
  const next = new Date(base)
  switch (r.frecuencia) {
    case 'diaria':    next.setDate(next.getDate() + 1); break
    case 'semanal':   next.setDate(next.getDate() + 7); break
    case 'quincenal': next.setDate(next.getDate() + 15); break
    case 'mensual':   next.setMonth(next.getMonth() + 1); break
    case 'custom':    next.setDate(next.getDate() + (r.intervalo_dias || 30)); break
  }
  return next
}

const UNITS = ['unidad','kg','gr','litro','ml','paquete','caja','docena']

export default function RecurrentesPage() {
  const { fmtMoney, fmtDate, t } = useApp()
  const supabase = createClient()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('recurring_expenses').select('*').order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    if (form.id) {
      await supabase.from('recurring_expenses').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('recurring_expenses').insert({ ...form, user_id: user.id })
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleToggle = async (r) => {
    await supabase.from('recurring_expenses').update({ activo: !r.activo }).eq('id', r.id)
    setList(prev => prev.map(x => x.id === r.id ? { ...x, activo: !x.activo } : x))
  }

  const handleDelete = async (id) => {
    await supabase.from('recurring_expenses').delete().eq('id', id)
    setList(prev => prev.filter(x => x.id !== id))
    setConfirmDelete(null)
  }

  const N1_COLORS = { Fijos:'#1e40af', Variables:'#059669', Extraordinarios:'#d97706', Imprevistos:'#dc2626' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>⟳ Cargando…</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, maxWidth: 340, width: '90%', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>¿Eliminar recurrente?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Los gastos ya generados se conservarán.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={S.btnGhost}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={S.btnDanger}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🔁 Gastos Recurrentes</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{list.length} configurados · {list.filter(r => r.activo).length} activos</p>
        </div>
        {!showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={S.btnPrimary}>
            + Nuevo recurrente
          </button>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <RecurrenteForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {/* LIST */}
      {!list.length && !showForm ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔁</div>
          <p style={{ fontWeight: 600 }}>No tenés gastos recurrentes configurados</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Creá uno para automatizar tus gastos fijos</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(r => {
            const proxima = calcProxima(r)
            const color = N1_COLORS[r.n1] || '#64748b'
            const freqLabel = FRECUENCIAS.find(f => f.val === r.frecuencia)?.label || r.frecuencia
            return (
              <div key={r.id} style={{ ...S.card, opacity: r.activo ? 1 : 0.65, borderLeft: `4px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{r.n4}</span>
                      <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${color}20`, color }}>{r.n1}</span>
                      <span style={{ ...S.badge, background: r.activo ? '#d1fae5' : '#f1f5f9', color: r.activo ? '#059669' : '#64748b' }}>
                        {r.activo ? '● Activo' : '○ Pausado'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>🔁 {freqLabel}{r.frecuencia === 'custom' ? ` (cada ${r.intervalo_dias}d)` : ''}</span>
                      <span>💰 <b style={{ color: 'var(--text-primary)' }}>{fmtMoney(r.monto)}</b></span>
                      {proxima && r.activo && <span>⏭️ Próxima: <b>{fmtDate(proxima.toISOString().split('T')[0])}</b></span>}
                      {r.ultimo_proceso && <span>✓ Última: {fmtDate(r.ultimo_proceso)}</span>}
                      {!r.ultimo_proceso && <span style={{ color: '#f59e0b' }}>⚠️ Sin procesar aún</span>}
                    </div>
                    {r.observaciones && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{r.observaciones}</p>}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => handleToggle(r)} title={r.activo ? 'Pausar' : 'Activar'}
                      style={{ ...S.btnIcon, color: r.activo ? '#f59e0b' : '#10b981' }}>
                      {r.activo ? '⏸' : '▶'}
                    </button>
                    <button onClick={() => { setEditing(r); setShowForm(true) }} title="Editar" style={S.btnIcon}>✏️</button>
                    <button onClick={() => setConfirmDelete(r.id)} title="Eliminar" style={{ ...S.btnIcon, color: '#ef4444' }}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
function RecurrenteForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const blank = { n1:'', n2:'', n3:'', n4:'', monto:'', unidad:'unidad', frecuencia:'mensual', intervalo_dias:30, fecha_inicio:today, fecha_fin:'', observaciones:'', activo:true }
  const [form, setForm] = useState(initial ? { ...initial, monto: String(initial.monto) } : blank)
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

  const valid = form.n1 && form.n2 && form.n3 && form.n4 && form.monto && form.frecuencia && form.fecha_inicio

  const handleSubmit = async () => {
    if (!valid || saving) return
    setSaving(true)
    await onSave({
      ...form,
      monto: parseFloat(form.monto),
      intervalo_dias: parseInt(form.intervalo_dias) || 30,
      fecha_fin: form.fecha_fin || null,
      ...(initial ? { id: initial.id } : {}),
    })
    setSaving(false)
  }

  const selStyle = { ...S.inp, cursor: 'pointer', appearance: 'none' }

  return (
    <div style={{ ...S.card, marginBottom: 20, border: '2px solid var(--accent)', background: 'var(--accent-light)' }}>
      <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontWeight: 800 }}>
        {initial ? '✏️ Editar recurrente' : '➕ Nuevo gasto recurrente'}
      </h3>

      {/* CATEGORÍA CASCADE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Tipo', key: 'n1', opts: opts_n1, disabled: false },
          { label: 'Área', key: 'n2', opts: opts_n2, disabled: !form.n1 },
          { label: 'Subcategoría', key: 'n3', opts: opts_n3, disabled: !form.n2 },
          { label: 'Ítem', key: 'n4', opts: opts_n4, disabled: !form.n3 },
        ].map(({ label, key, opts, disabled }) => (
          <div key={key}>
            <label style={S.lbl}>{label}</label>
            <select value={form[key]} onChange={e => set(key, e.target.value)} disabled={disabled}
              style={{ ...selStyle, background: disabled ? 'var(--bg-muted)' : 'var(--surface)', color: form[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              <option value="">Seleccionar…</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* FRECUENCIA */}
      <div style={{ marginBottom: 16 }}>
        <label style={S.lbl}>Frecuencia</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FRECUENCIAS.map(f => (
            <button key={f.val} onClick={() => set('frecuencia', f.val)}
              style={{ ...S.freqBtn, ...(form.frecuencia === f.val ? S.freqBtnActive : {}) }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        {form.frecuencia === 'custom' && (
          <div style={{ marginTop: 10 }}>
            <label style={S.lbl}>Cada cuántos días</label>
            <input type="number" min="1" value={form.intervalo_dias} onChange={e => set('intervalo_dias', e.target.value)} style={{ ...S.inp, width: 120 }} />
          </div>
        )}
      </div>

      {/* MONTO + UNIDAD + FECHAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={S.lbl}>Monto ($)</label>
          <input type="number" min="0" value={form.monto} onChange={e => set('monto', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>Unidad</label>
          <select value={form.unidad} onChange={e => set('unidad', e.target.value)} style={selStyle}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Fecha inicio</label>
          <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>Fecha fin (opcional)</label>
          <input type="date" value={form.fecha_fin || ''} onChange={e => set('fecha_fin', e.target.value)} style={S.inp} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.lbl}>Observaciones</label>
        <input type="text" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas…" style={S.inp} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
          Activar inmediatamente
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={S.btnGhost}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!valid || saving} style={{ ...S.btnPrimary, opacity: valid ? 1 : 0.5 }}>
            {saving ? 'Guardando…' : initial ? '💾 Guardar' : '✅ Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  card:         { background: 'var(--surface)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' },
  badge:        { padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 },
  btnPrimary:   { padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 12px rgba(59,130,246,.3)' },
  btnGhost:     { padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  btnDanger:    { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  btnIcon:      { border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)' },
  inp:          { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' },
  lbl:          { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' },
  freqBtn:      { padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  freqBtnActive:{ borderColor: 'var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)' },
}
