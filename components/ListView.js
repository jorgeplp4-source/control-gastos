'use client'
import { useState, useMemo } from 'react'
import { N1_COLORS, fmt, fmtDate, uniq } from '../lib/constants'
import { useApp } from '../context/AppContext'

// ── Períodos predefinidos ──────────────────────────────────────────────────────
function getPeriodo(id) {
  const hoy = new Date()
  const pad = n => String(n).padStart(2, '0')
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

  switch (id) {
    case 'hoy': {
      const s = iso(hoy); return { from: s, to: s }
    }
    case 'semana': {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      return { from: iso(lunes), to: iso(hoy) }
    }
    case '7dias': {
      const d = new Date(hoy); d.setDate(d.getDate() - 6)
      return { from: iso(d), to: iso(hoy) }
    }
    case 'mes': {
      return { from: `${hoy.getFullYear()}-${pad(hoy.getMonth()+1)}-01`, to: iso(hoy) }
    }
    case 'mes_ant': {
      const m = hoy.getMonth() === 0 ? 12 : hoy.getMonth()
      const y = hoy.getMonth() === 0 ? hoy.getFullYear()-1 : hoy.getFullYear()
      const ultimo = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return { from: `${y}-${pad(m)}-01`, to: iso(ultimo) }
    }
    case 'anio': {
      return { from: `${hoy.getFullYear()}-01-01`, to: iso(hoy) }
    }
    default: return { from: '', to: '' }
  }
}

const PERIODOS = [
  { id: 'hoy',      label: 'Hoy' },
  { id: 'semana',   label: 'Esta semana' },
  { id: '7dias',    label: 'Últimos 7 días' },
  { id: 'mes',      label: 'Este mes' },
  { id: 'mes_ant',  label: 'Mes anterior' },
  { id: 'anio',     label: 'Este año' },
  { id: 'custom',   label: 'Personalizado' },
]

export default function ListView({ gastos, onDelete, onEdit }) {
  const { fmtMoney } = useApp()
  const [fN1, setFN1]         = useState('')
  const [fFrom, setFFrom]     = useState('')
  const [fTo, setFTo]         = useState('')
  const [search, setSearch]   = useState('')
  const [periodo, setPeriodo] = useState('mes')
  const [confirmId, setConfirmId] = useState(null)
  const [sortField, setSortField] = useState('fecha')
  const [sortDir, setSortDir]     = useState('desc')

  const tiposDisp = uniq(gastos.map(g => g.n1))

  // Aplicar período al cambiar el selector
  const handlePeriodo = (id) => {
    setPeriodo(id)
    if (id !== 'custom') {
      const { from, to } = getPeriodo(id)
      setFFrom(from)
      setFTo(to)
    }
  }

  // Inicializar con mes actual
  useMemo(() => { handlePeriodo('mes') }, [])

  // Toggle de ordenamiento
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = gastos.filter(g => {
      if (fN1 && g.n1 !== fN1) return false
      if (fFrom && g.fecha < fFrom) return false
      if (fTo && g.fecha > fTo) return false
      if (search) {
        const q = search.toLowerCase()
        if (![g.n1, g.n2, g.n3, g.n4, g.observaciones].some(v => (v || '').toLowerCase().includes(q))) return false
      }
      return true
    })
    // Ordenar
    list = [...list].sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (sortField === 'monto') { va = parseFloat(va); vb = parseFloat(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [gastos, fN1, fFrom, fTo, search, sortField, sortDir])

  const total = filtered.reduce((s, g) => s + (g.monto || 0), 0)
  const avg   = filtered.length ? total / filtered.length : 0
  const max   = filtered.length ? Math.max(...filtered.map(g => g.monto || 0)) : 0

  const byN1 = useMemo(() => {
    const m = {}
    filtered.forEach(g => { m[g.n1] = (m[g.n1] || 0) + g.monto })
    return Object.entries(m)
      .map(([n, v]) => ({ n, v, pct: total ? Math.round(v / total * 100) : 0 }))
      .sort((a, b) => b.v - a.v)
  }, [filtered, total])

  const S = styles
  const SortIcon = ({ field }) => (
    <span style={{ fontSize: 9, marginLeft: 3, opacity: sortField === field ? 1 : 0.3 }}>
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  )

  const hayFiltros = fN1 || search || periodo !== 'mes'

  if (!gastos.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 64 }}>📋</div>
      <h2 style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Sin gastos registrados</h2>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, maxWidth: 340, width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>¿Eliminar este gasto?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmId(null)} style={S.btnGhost}>Cancelar</button>
              <button onClick={() => { onDelete(confirmId); setConfirmId(null) }} style={S.btnDanger}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div style={S.card}>
        {/* Selector de período — chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            📅 Período
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIODOS.map(p => (
              <button key={p.id} onClick={() => handlePeriodo(p.id)}
                style={{ ...S.chip, ...(periodo === p.id ? S.chipActive : {}) }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas custom (visible solo cuando período = custom) */}
        {periodo === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={S.inp} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>al</span>
            <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={S.inp} />
          </div>
        )}

        {/* Búsqueda + tipo */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="🔍 Buscar por categoría, ítem o nota…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...S.inp, flex: 1, minWidth: 200 }} />
          <select value={fN1} onChange={e => setFN1(e.target.value)} style={{ ...S.inp, minWidth: 140 }}>
            <option value="">Todos los tipos</option>
            {tiposDisp.map(t => <option key={t}>{t}</option>)}
          </select>
          {hayFiltros && (
            <button onClick={() => { setFN1(''); setSearch(''); handlePeriodo('mes') }}
              style={{ ...S.btnGhost, color: '#ef4444', fontSize: 13 }}>✕ Limpiar</button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {[
          { label: 'Total período', value: fmtMoney ? fmtMoney(total) : fmt(total), color: '#3b82f6', icon: '💸' },
          { label: 'Registros', value: filtered.length, color: '#10b981', icon: '📝' },
          { label: 'Promedio', value: fmtMoney ? fmtMoney(avg) : fmt(avg), color: '#f59e0b', icon: '📊' },
          { label: 'Mayor gasto', value: fmtMoney ? fmtMoney(max) : fmt(max), color: '#8b5cf6', icon: '🔝' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ ...S.card, borderTop: `3px solid ${s.color}`, padding: '14px 18px' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── RESUMEN POR TIPO ── */}
      {byN1.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Distribución por tipo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
            {byN1.map(({ n, v, pct }) => {
              const c = N1_COLORS[n] || { bg: '#64748b', light: 'var(--surface2)', text: '#64748b' }
              return (
                <div key={n} onClick={() => setFN1(fN1 === n ? '' : n)}
                  style={{ padding: '12px 16px', background: fN1 === n ? c.light : 'var(--surface2)', borderRadius: 10, border: `1.5px solid ${fN1 === n ? c.bg : 'var(--border)'}`, cursor: 'pointer', transition: 'all .15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{n}</span>
                    <span style={{ fontWeight: 800, fontSize: 12, color: c.bg }}>{pct}%</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: c.bg, marginBottom: 6 }}>{fmt(v)}</div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c.bg, borderRadius: 99, transition: 'width .3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
          {fN1 && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>Filtrando por: <strong>{fN1}</strong> · Clic para quitar filtro</p>}
        </div>
      )}

      {/* ── TABLA ── */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={S.sectionTitle}>{filtered.length} registros</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {[
                  { label: 'Fecha', field: 'fecha' },
                  { label: 'Tipo', field: 'n1' },
                  { label: 'Área', field: 'n2' },
                  { label: 'Subcategoría', field: 'n3' },
                  { label: 'Ítem', field: 'n4' },
                  { label: 'Cantidad', field: null },
                  { label: 'Monto', field: 'monto' },
                  { label: 'Nota', field: null },
                  { label: '', field: null },
                ].map(({ label, field }) => (
                  <th key={label}
                    onClick={field ? () => handleSort(field) : undefined}
                    style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 800, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)', cursor: field ? 'pointer' : 'default', userSelect: 'none' }}>
                    {label}{field && <SortIcon field={field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => {
                const c = N1_COLORS[g.n1] || { bg: '#64748b', light: 'var(--surface2)', text: '#64748b' }
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(g.fecha)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: c.light, color: c.text, whiteSpace: 'nowrap' }}>{g.n1}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.n2}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.n3}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{g.n4}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{g.cantidad} {g.unidad}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: c.text, whiteSpace: 'nowrap' }}>{fmt(g.monto)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontStyle: g.observaciones ? 'normal' : 'italic' }}>{g.observaciones || '—'}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => onEdit(g)} title="Editar" style={{ border: 'none', background: 'none', fontSize: 15, marginRight: 2, cursor: 'pointer', opacity: .7 }}>✏️</button>
                      <button onClick={() => setConfirmId(g.id)} title="Eliminar" style={{ border: 'none', background: 'none', fontSize: 15, cursor: 'pointer', opacity: .7 }}>🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p style={{ fontWeight: 600 }}>Sin resultados para este período</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Probá cambiando el período o los filtros</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  card:        { background: 'var(--surface)', borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' },
  sectionTitle:{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  inp:         { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)', fontFamily: 'inherit' },
  chip:        { padding: '6px 14px', borderRadius: 99, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' },
  chipActive:  { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff', fontWeight: 800 },
  btnGhost:    { padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnDanger:   { padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' },
}
