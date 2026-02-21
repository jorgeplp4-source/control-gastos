'use client'
import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { N1_COLORS, CHART_COLORS, fmt, uniq } from '../lib/constants'

export default function Dashboard({ gastos }) {
  const total = gastos.reduce((s, g) => s + (g.monto || 0), 0)

  const byN1 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { m[g.n1] = (m[g.n1] || 0) + g.monto })
    return Object.entries(m)
      .map(([name, value]) => ({ name, value, pct: total ? Math.round(value / total * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [gastos, total])

  const byN3 = useMemo(() => {
    const m = {}
    gastos.forEach(g => { m[g.n3] = (m[g.n3] || 0) + g.monto })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [gastos])

  const topItems = useMemo(() => {
    const m = {}
    gastos.forEach(g => {
      if (!m[g.n4]) m[g.n4] = { name: g.n4, cantidad: 0, monto: 0, unidad: g.unidad }
      m[g.n4].cantidad += parseFloat(g.cantidad) || 0
      m[g.n4].monto += g.monto || 0
    })
    return Object.values(m).sort((a, b) => b.monto - a.monto).slice(0, 6)
  }, [gastos])

  const dias = uniq(gastos.map(g => g.fecha)).length || 1

  if (!gastos.length) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 64 }}>📊</div>
      <h2 style={{ color: '#64748b', marginTop: 12 }}>Sin datos todavía</h2>
      <p style={{ color: '#94a3b8' }}>Registrá tu primer gasto para ver el dashboard</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        {[
          { icon: '💸', label: 'Total Gastado', value: fmt(total), color: '#3b82f6' },
          { icon: '📝', label: 'Registros', value: gastos.length, color: '#10b981' },
          { icon: '📅', label: 'Promedio/día', value: fmt(total / dias), color: '#f59e0b' },
          { icon: '🏷️', label: 'Tipos activos', value: byN1.length, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
        <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Subcategorías</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byN3} margin={{ left: -16 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} labelStyle={{ fontWeight: 600 }} />
              <Bar dataKey="value" name="Gasto" radius={[4, 4, 0, 0]}>
                {byN3.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distribución por Tipo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byN1} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ pct }) => `${pct}%`} labelLine={false}>
                {byN1.map((e, i) => <Cell key={i} fill={(N1_COLORS[e.name] || {}).bg || CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byN1.map(({ name, value, pct }) => {
              const c = N1_COLORS[name] || { bg: '#64748b', light: '#f1f5f9', text: '#64748b' }
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: c.text }}>{name}</span>
                    <span style={{ color: '#64748b' }}>{fmt(value)} <b style={{ color: c.bg }}>({pct}%)</b></span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c.bg, borderRadius: 99, transition: 'width .5s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top items */}
      <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏆 Top Ítems por Gasto</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {topItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{item.cantidad} {item.unidad}</div>
              </div>
              <div style={{ fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length], fontSize: 14, flexShrink: 0 }}>{fmt(item.monto)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
