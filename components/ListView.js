'use client'
import { useState, useMemo } from 'react'
import { N1_COLORS, fmt, fmtDate, uniq } from '../lib/constants'

export default function ListView({ gastos, onDelete, onEdit }) {
  const [fN1, setFN1] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const tiposDisp = uniq(gastos.map(g => g.n1))

  const filtered = useMemo(() => gastos.filter(g => {
    if (fN1 && g.n1 !== fN1) return false
    if (fFrom && g.fecha < fFrom) return false
    if (fTo && g.fecha > fTo) return false
    if (search) { const q = search.toLowerCase(); if (![g.n1, g.n2, g.n3, g.n4, g.observaciones].some(v => (v || '').toLowerCase().includes(q))) return false }
    return true
  }), [gastos, fN1, fFrom, fTo, search])

  const total = filtered.reduce((s, g) => s + (g.monto || 0), 0)
  const avg = filtered.length ? total / filtered.length : 0

  const byN1 = useMemo(() => {
    const m = {}
    filtered.forEach(g => { m[g.n1] = (m[g.n1] || 0) + g.monto })
    return Object.entries(m).map(([n, v]) => ({ n, v, pct: total ? Math.round(v / total * 100) : 0 })).sort((a, b) => b.v - a.v)
  }, [filtered, total])

  const inp = { padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#1a2332' }

  if (!gastos.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 64 }}>📋</div>
      <h2 style={{ color: '#64748b', marginTop: 12 }}>Sin gastos registrados</h2>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {confirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 340, width: '90%', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px' }}>¿Eliminar este gasto?</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => { onDelete(confirmId); setConfirmId(null) }} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {[{ label: 'Total filtrado', value: fmt(total), color: '#3b82f6' }, { label: 'Registros', value: filtered.length, color: '#10b981' }, { label: 'Promedio', value: fmt(avg), color: '#f59e0b' }].map((s, i) => (
          <div key={i} className="card" style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="card" style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtros</span>
        <input placeholder="🔍 Buscar…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, minWidth: 160 }} />
        <select value={fN1} onChange={e => setFN1(e.target.value)} style={inp}>
          <option value="">Todos los tipos</option>
          {tiposDisp.map(t => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={inp} />
        <span style={{ color: '#94a3b8', fontSize: 13 }}>al</span>
        <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={inp} />
        {(fN1 || fFrom || fTo || search) && (
          <button onClick={() => { setFN1(''); setFFrom(''); setFTo(''); setSearch('') }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>✕ Limpiar</button>
        )}
      </div>

      {/* N1 SUMMARY */}
      {byN1.length > 0 && (
        <div className="card" style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Resumen por Tipo de Gasto</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            {byN1.map(({ n, v, pct }) => {
              const c = N1_COLORS[n] || { bg: '#64748b', light: '#f1f5f9', text: '#64748b' }
              return (
                <div key={n} style={{ padding: '12px 16px', background: c.light, borderRadius: 10, border: `1px solid ${c.bg}22` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: c.text }}>{n}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: c.bg }}>{pct}%</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: c.bg, marginBottom: 6 }}>{fmt(v)}</div>
                  <div style={{ height: 5, background: `${c.bg}30`, borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c.bg, borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="card" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Fecha', 'Tipo', 'Área', 'Subcategoría', 'Ítem', 'Cantidad', 'Monto', 'Nota', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => {
                const c = N1_COLORS[g.n1] || { bg: '#64748b', light: '#f8fafc', text: '#64748b' }
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>{fmtDate(g.fecha)}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: c.light, color: c.text, whiteSpace: 'nowrap' }}>{g.n1}</span></td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.n2}</td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.n3}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>{g.n4}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{g.cantidad} {g.unidad}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: c.text, whiteSpace: 'nowrap' }}>{fmt(g.monto)}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{g.observaciones}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => onEdit(g)} title="Editar" style={{ border: 'none', background: 'none', fontSize: 16, marginRight: 2, opacity: .75 }}>✏️</button>
                      <button onClick={() => setConfirmId(g.id)} title="Eliminar" style={{ border: 'none', background: 'none', fontSize: 16, opacity: .75 }}>🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Sin resultados</div>}
        </div>
      </div>
    </div>
  )
}
