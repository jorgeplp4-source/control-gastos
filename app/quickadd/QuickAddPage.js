'use client'
// app/quick-add/page.js
// Ruta ultra-minimalista optimizada para pantalla de inicio (PWA shortcut)
import { useState } from 'react'
import { createClient } from '../../lib/supabase-browser'
import { CSV_CATEGORIES, uniq } from '../../lib/constants'
import { useApp } from '../../context/AppContext'

export default function QuickAddPage() {
  const { fmtMoney } = useApp()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [monto, setMonto] = useState('')
  const [n1, setN1] = useState('')
  const [n2, setN2] = useState('')
  const [n3, setN3] = useState('')
  const [n4, setN4] = useState('')
  const [fecha, setFecha] = useState(today)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [step, setStep] = useState(1) // 1=monto, 2=categoria, 3=confirm

  const opts_n1 = uniq(CSV_CATEGORIES.map(c => c.n1))
  const opts_n2 = uniq(CSV_CATEGORIES.filter(c => c.n1 === n1).map(c => c.n2))
  const opts_n3 = uniq(CSV_CATEGORIES.filter(c => c.n1 === n1 && c.n2 === n2).map(c => c.n3))
  const opts_n4 = uniq(CSV_CATEGORIES.filter(c => c.n1 === n1 && c.n2 === n2 && c.n3 === n3).map(c => c.n4))

  const N1_COLORS = { Fijos:'#1e40af', Variables:'#059669', Extraordinarios:'#d97706', Imprevistos:'#dc2626' }

  const handleSave = async () => {
    if (!monto || !n1 || !n2 || !n3 || !n4) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('gastos').insert({
      user_id: user.id, n1, n2, n3, n4,
      monto: parseFloat(monto), cantidad: 1, unidad: 'unidad',
      fecha, observaciones: '(Registro rápido)',
    })
    setSaving(false)
    setDone(true)
    setTimeout(() => {
      setMonto(''); setN1(''); setN2(''); setN3(''); setN4(''); setDone(false); setStep(1)
    }, 2000)
  }

  const reset = (fromStep) => {
    if (fromStep <= 1) { setN1(''); setN2(''); setN3(''); setN4('') }
    if (fromStep <= 2) { setN2(''); setN3(''); setN4('') }
    setStep(fromStep)
  }

  if (done) return (
    <div style={QS.wrap}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#10b981', fontWeight: 800, fontSize: 24 }}>¡Registrado!</h2>
        <p style={{ color: '#64748b', marginTop: 8 }}>{fmtMoney(parseFloat(monto))}</p>
      </div>
    </div>
  )

  return (
    <div style={QS.wrap}>
      <div style={QS.card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>⚡</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Gasto rápido</h1>
        </div>

        {/* Step 1: Monto */}
        <div style={{ marginBottom: 20 }}>
          <label style={QS.lbl}>💰 Monto</label>
          <input
            type="number" inputMode="decimal" min="0" step="1"
            value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0"
            style={{ ...QS.inp, fontSize: 28, fontWeight: 800, textAlign: 'center', color: 'var(--accent)' }}
            autoFocus
          />
          {monto && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{fmtMoney(parseFloat(monto) || 0)}</p>}
        </div>

        {/* Step 2: Categoría cascade simplificada */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <label style={QS.lbl}>🏷️ Categoría</label>

          {/* N1 chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {opts_n1.map(o => (
              <button key={o} onClick={() => { setN1(o); setN2(''); setN3(''); setN4('') }}
                style={{ ...QS.chip, ...(n1 === o ? { background: N1_COLORS[o] || '#3b82f6', color: '#fff', borderColor: N1_COLORS[o] } : {}) }}>
                {o}
              </button>
            ))}
          </div>

          {/* N2 */}
          {n1 && (
            <select value={n2} onChange={e => { setN2(e.target.value); setN3(''); setN4('') }} style={QS.sel}>
              <option value="">Área…</option>
              {opts_n2.map(o => <option key={o}>{o}</option>)}
            </select>
          )}

          {/* N3 */}
          {n2 && (
            <select value={n3} onChange={e => { setN3(e.target.value); setN4('') }} style={QS.sel}>
              <option value="">Subcategoría…</option>
              {opts_n3.map(o => <option key={o}>{o}</option>)}
            </select>
          )}

          {/* N4 */}
          {n3 && (
            <select value={n4} onChange={e => setN4(e.target.value)} style={QS.sel}>
              <option value="">Ítem…</option>
              {opts_n4.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 24 }}>
          <label style={QS.lbl}>📅 Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={QS.inp} />
        </div>

        {/* Botón */}
        <button
          onClick={handleSave}
          disabled={!monto || !n4 || saving}
          style={{ ...QS.btnSave, opacity: monto && n4 ? 1 : 0.4 }}>
          {saving ? 'Registrando…' : '✅ Registrar gasto'}
        </button>

        {/* Link a app completa */}
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            Ver app completa →
          </a>
        </p>
      </div>
    </div>
  )
}

const QS = {
  wrap:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--bg)' },
  card:   { width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 20, padding: 28, boxShadow: '0 12px 40px rgba(0,0,0,.12)' },
  lbl:    { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
  inp:    { width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 16, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  sel:    { width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' },
  chip:   { padding: '8px 16px', borderRadius: 99, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  btnSave:{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 20px rgba(59,130,246,.35)' },
}
