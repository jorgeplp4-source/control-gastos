'use client'
// app/quick-add/page.js — Ruta ultra-minimalista para pantalla de inicio (PWA shortcut)
// force-dynamic: evita prerender estático (usa Supabase + Context que no corren en SSR)
export const dynamic = 'force-dynamic'
import { useState, useMemo } from 'react'
import { createClient } from '../../lib/supabase-browser'
import { uniq } from '../../lib/constants'
import { useApp } from '../../context/AppContext'
import { useCategories } from '../../lib/useCategories'
import {
  IconExito, IconRapido, IconDinero, IconEtiquetas, IconCalendario, IconArrowRight,
} from '../../lib/icons'

export default function QuickAddPage() {
  const { fmtMoney } = useApp()
  const { categories } = useCategories()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [monto, setMonto] = useState('')
  const [n1, setN1]       = useState('')
  const [n2, setN2]       = useState('')
  const [n3, setN3]       = useState('')
  const [n4, setN4]       = useState('')
  const [fecha, setFecha] = useState(today)
  const [saving, setSaving] = useState(false)
  const [done, setDone]   = useState(false)

  const opts_n1 = useMemo(() => uniq(categories.map(c => c.n1)), [categories])
  const opts_n2 = useMemo(() => uniq(categories.filter(c => c.n1 === n1).map(c => c.n2)), [categories, n1])
  const opts_n3 = useMemo(() => uniq(categories.filter(c => c.n1 === n1 && c.n2 === n2).map(c => c.n3)), [categories, n1, n2])
  const opts_n4 = useMemo(() => uniq(categories.filter(c => c.n1 === n1 && c.n2 === n2 && c.n3 === n3).map(c => c.n4)), [categories, n1, n2, n3])

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
      setMonto(''); setN1(''); setN2(''); setN3(''); setN4(''); setDone(false)
    }, 2000)
  }

  // ── Estado "registrado" ─────────────────────────────────────────────────────
  if (done) return (
    <div style={QS.wrap}>
      <div style={{ textAlign: 'center' }}>
        <IconExito size={72} weight="fill" color="#10b981" aria-label="Registrado exitosamente" style={{ marginBottom: 16 }} />
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
          <IconRapido size={36} weight="fill" color="var(--accent)" aria-hidden="true" style={{ marginBottom: 6 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Gasto rápido</h1>
        </div>

        {/* Monto */}
        <div style={{ marginBottom: 20 }}>
          <label style={QS.lbl}>
            <IconDinero size={12} aria-hidden="true" style={{ marginRight: 4 }} />
            Monto
          </label>
          <input
            type="number" inputMode="decimal" min="0" step="1"
            value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0" autoFocus
            aria-label="Ingresá el monto del gasto"
            style={{ ...QS.inp, fontSize: 28, fontWeight: 800, textAlign: 'center', color: 'var(--accent)' }}
          />
          {monto && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{fmtMoney(parseFloat(monto) || 0)}</p>}
        </div>

        {/* Categoría */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <label style={QS.lbl}>
            <IconEtiquetas size={12} aria-hidden="true" style={{ marginRight: 4 }} />
            Categoría
          </label>

          {/* N1 chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Tipo de gasto">
            {opts_n1.map(o => (
              <button key={o} onClick={() => { setN1(o); setN2(''); setN3(''); setN4('') }}
                aria-pressed={n1 === o}
                style={{ ...QS.chip, ...(n1 === o ? { background: N1_COLORS[o] || '#3b82f6', color: '#fff', borderColor: N1_COLORS[o] } : {}) }}>
                {o}
              </button>
            ))}
          </div>

          {n1 && (
            <select value={n2} onChange={e => { setN2(e.target.value); setN3(''); setN4('') }} style={QS.sel} aria-label="Área">
              <option value="">Área…</option>
              {opts_n2.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
          {n2 && (
            <select value={n3} onChange={e => { setN3(e.target.value); setN4('') }} style={QS.sel} aria-label="Subcategoría">
              <option value="">Subcategoría…</option>
              {opts_n3.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
          {n3 && (
            <select value={n4} onChange={e => setN4(e.target.value)} style={QS.sel} aria-label="Ítem">
              <option value="">Ítem…</option>
              {opts_n4.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 24 }}>
          <label style={QS.lbl}>
            <IconCalendario size={12} aria-hidden="true" style={{ marginRight: 4 }} />
            Fecha
          </label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={QS.inp} aria-label="Fecha del gasto" />
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={!monto || !n4 || saving}
          aria-busy={saving}
          style={{ ...QS.btnSave, opacity: monto && n4 ? 1 : 0.4 }}>
          <IconExito size={18} weight="fill" aria-hidden="true" />
          {saving ? 'Registrando…' : 'Registrar gasto'}
        </button>

        {/* Link app completa */}
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Ver app completa
            <IconArrowRight size={13} aria-hidden="true" />
          </a>
        </p>
      </div>
    </div>
  )
}

const QS = {
  wrap:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--bg)' },
  card:    { width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 20, padding: 28, boxShadow: '0 12px 40px rgba(0,0,0,.12)' },
  lbl:    { display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
  inp:    { width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 16, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  sel:    { width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' },
  chip:   { padding: '8px 16px', borderRadius: 99, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  btnSave:{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 20px rgba(59,130,246,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
}
