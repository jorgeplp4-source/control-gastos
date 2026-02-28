'use client'
import { useState } from 'react'
import { useUnits } from '../lib/useUnits'
import { IconPlus, IconEliminar, IconSpinner, IconCheck } from '../lib/icons'

export default function UnitsManager() {
  const { allUnits, loading, refetch } = useUnits()
  const [nueva, setNueva] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    const nombre = nueva.trim().toLowerCase()
    if (!nombre || nombre.length < 1) return
    if (allUnits.some(u => u.nombre === nombre)) { setError('Ya existe esa unidad'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/units', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); setSaving(false); return }
    setNueva('')
    refetch()
    setSaving(false)
  }

  const handleDelete = async (nombre) => {
    setDeleting(nombre)
    await fetch('/api/units', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    })
    refetch()
    setDeleting(null)
  }

  const inp = {
    padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit', flex: 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Agregar nueva */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Nueva unidad
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={nueva}
            onChange={e => { setNueva(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder='Ej: tonelada, ampolla, metro cúbico…'
            style={inp}
          />
          <button onClick={handleAdd} disabled={saving || !nueva.trim()}
            style={{ padding: '9px 16px', border: 'none', borderRadius: 9, background: nueva.trim() ? 'var(--accent)' : 'var(--border)', color: nueva.trim() ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: nueva.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {saving ? <IconSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> : <IconPlus size={14} aria-hidden="true" />}
            Agregar
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{error}</p>}
      </div>

      {/* Lista */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Unidades disponibles ({allUnits.length})
        </p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
            <IconSpinner size={20} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allUnits.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px 5px 12px', borderRadius: 99, border: `1.5px solid ${u.system ? 'var(--border)' : 'var(--accent)'}`, background: u.system ? 'var(--surface2)' : 'var(--accent-light)', fontSize: 13, fontWeight: 600, color: u.system ? 'var(--text-secondary)' : 'var(--accent)' }}>
                {u.nombre}
                {u.system ? (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 2 }} title="Unidad del sistema">sys</span>
                ) : (
                  <button onClick={() => handleDelete(u.nombre)} disabled={deleting === u.nombre}
                    aria-label={`Eliminar ${u.nombre}`}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '1px', display: 'flex', marginLeft: 2, opacity: deleting === u.nombre ? 0.5 : 1 }}>
                    {deleting === u.nombre
                      ? <IconSpinner size={10} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                      : <IconEliminar size={11} aria-hidden="true" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Las unidades del sistema (sys) no se pueden eliminar. Las personalizadas sí.
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
