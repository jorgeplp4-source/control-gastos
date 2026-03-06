'use client'
import { useMemo, useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0)

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtMes(d) {
  if (!d) return ''
  const [y, m] = d.split('-')
  return `${MESES[parseInt(m) - 1]} ${y}`
}

function fmtMesCorto(d) {
  if (!d) return ''
  const [, m] = d.split('-')
  return MESES[parseInt(m) - 1]
}

const TODAY      = new Date().toISOString().split('T')[0]
const CUR_MONTH  = TODAY.substring(0, 7)                     // "2026-03"

const MEDIO_ICON  = { credito: '💳', debito: '🏧', efectivo: '💵', transferencia: '📲' }
const MEDIO_LABEL = { credito: 'Crédito', debito: 'Débito', efectivo: 'Efectivo', transferencia: 'Transfer.' }

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 14px', borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Cuota pill ────────────────────────────────────────────────────────────────
function CuotaPill({ c, total }) {
  const mes = c.fecha ? c.fecha.substring(0, 7) : ''
  const isPaid    = mes < CUR_MONTH
  const isCurrent = mes === CUR_MONTH
  // isPending = mes > CUR_MONTH (implícito)

  let bg, color, border, prefix
  if (isCurrent) {
    bg = '#ede9fe'; color = '#5b21b6'; border = '1.5px solid #7c3aed'; prefix = '●'
  } else if (isPaid) {
    bg = 'var(--surface2)'; color = 'var(--text-muted)'; border = '1.5px solid var(--border)'; prefix = '✓'
  } else {
    bg = '#fff7ed'; color = '#c2410c'; border = '1.5px solid #fed7aa'; prefix = null
  }

  return (
    <div style={{
      background: bg, color, border, borderRadius: 10,
      padding: '6px 11px', fontSize: 12, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 5,
      opacity: isPaid ? 0.6 : 1,
    }}>
      {prefix && <span style={{ fontSize: 9 }}>{prefix}</span>}
      <span style={{ fontWeight: 700 }}>{c.cuota_numero}/{total}</span>
      <span style={{ fontWeight: 500, fontSize: 11 }}>{fmtMesCorto(c.fecha)}</span>
      <span>{fmt(c.monto)}</span>
    </div>
  )
}

// ── Purchase card ─────────────────────────────────────────────────────────────
function PurchaseCard({ p, isExpanded, onToggle }) {
  const pagadas   = p.cuotas.filter(c => c.fecha && c.fecha.substring(0, 7) <= CUR_MONTH).length
  const pct       = Math.round((pagadas / p.cuotas_total) * 100)
  const isActive  = p.cuotas.some(c => c.fecha && c.fecha.substring(0, 7) > CUR_MONTH)
  const deudaRestante = p.cuotas
    .filter(c => c.fecha && c.fecha.substring(0, 7) >= CUR_MONTH)
    .reduce((s, c) => s + (c.monto || 0), 0)

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 14,
      border: `1.5px solid ${isActive ? '#ddd6fe' : 'var(--border)'}`,
      overflow: 'hidden',
      opacity: isActive ? 1 : 0.75,
    }}>
      {/* ── Header (clickable) ─────────────────────────────────────────────── */}
      <div
        onClick={onToggle}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: isActive ? '#ede9fe' : 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {MEDIO_ICON[p.medio_pago] || '💳'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {p.nombre}
            </span>
            {!isActive && (
              <span style={{
                fontSize: 11, background: '#d1fae5', color: '#065f46',
                padding: '1px 8px', borderRadius: 99, fontWeight: 600,
              }}>✓ Saldada</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {fmtMes(p.fecha_compra)} · {p.cuotas_total} cuotas · {MEDIO_LABEL[p.medio_pago] || p.medio_pago}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
              <span>{pagadas} de {p.cuotas_total} pagadas</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${pct}%`,
                background: isActive ? '#7c3aed' : '#10b981',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Amounts */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: isActive ? '#7c3aed' : 'var(--text-muted)' }}>
            {fmt(p.monto_cuota)}
            <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>/mes</span>
          </div>
          {isActive ? (
            <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 600, marginTop: 2 }}>
              resta {fmt(deudaRestante)}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              total {fmt(p.monto_total)}
            </div>
          )}
        </div>

        {/* Chevron */}
        <span style={{
          color: 'var(--text-muted)', fontSize: 14, flexShrink: 0,
          transition: 'transform 0.2s',
          transform: isExpanded ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </div>

      {/* ── Expanded: installment pills ───────────────────────────────────── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
            CUOTAS DETALLE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {p.cuotas.map(c => (
              <CuotaPill key={c.id} c={c} total={p.cuotas_total} />
            ))}
          </div>
          {/* Summary row */}
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
            display: 'flex', gap: 20, flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text-muted)',
          }}>
            <span>🛒 Compra: <strong style={{ color: 'var(--text)' }}>{fmtMes(p.fecha_compra)}</strong></span>
            <span>💳 {MEDIO_LABEL[p.medio_pago]}</span>
            <span>📦 {p.n2 || p.n1 || '–'}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text)' }}>Total: {fmt(p.monto_total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CuotasDashboard({ gastos = [] }) {
  const [expanded, setExpanded] = useState(new Set())
  const [mostrarSaldadas, setMostrarSaldadas] = useState(false)

  const toggle = (id) => setExpanded(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  // ── Agrupar por compra_id ─────────────────────────────────────────────────
  const purchases = useMemo(() => {
    const groups = {}
    gastos.forEach(g => {
      if (!g.compra_id || !g.cuotas_total || g.cuotas_total <= 1) return
      if (!groups[g.compra_id]) {
        groups[g.compra_id] = {
          compra_id:   g.compra_id,
          nombre:      (g.n4 || '').replace(/\s*\(\d+\/\d+\)$/, '').trim(),
          n1: g.n1, n2: g.n2, n3: g.n3,
          medio_pago:  g.medio_pago || 'credito',
          fecha_compra: g.fecha_compra || g.fecha,
          monto_cuota: g.monto,
          cuotas_total: g.cuotas_total,
          monto_total:  Math.round(g.monto * g.cuotas_total),
          cuotas: [],
        }
      }
      groups[g.compra_id].cuotas.push(g)
    })
    return Object.values(groups)
      .map(p => ({
        ...p,
        cuotas: p.cuotas.sort((a, b) => (a.cuota_numero || 0) - (b.cuota_numero || 0)),
      }))
      .sort((a, b) => {
        // Activas primero, luego por fecha_compra desc
        const aActive = a.cuotas.some(c => c.fecha && c.fecha.substring(0, 7) > CUR_MONTH)
        const bActive = b.cuotas.some(c => c.fecha && c.fecha.substring(0, 7) > CUR_MONTH)
        if (aActive !== bActive) return bActive ? 1 : -1
        return (b.fecha_compra || '').localeCompare(a.fecha_compra || '')
      })
  }, [gastos])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let deudaTotal = 0, esteMes = 0, activas = 0
    let proximaCuota = null

    purchases.forEach(p => {
      const isActive = p.cuotas.some(c => c.fecha && c.fecha.substring(0, 7) > CUR_MONTH)
      if (isActive) activas++
      p.cuotas.forEach(c => {
        if (!c.fecha) return
        const mes = c.fecha.substring(0, 7)
        if (mes >= CUR_MONTH) deudaTotal += c.monto || 0
        if (mes === CUR_MONTH) esteMes += c.monto || 0
        if (mes > CUR_MONTH) {
          if (!proximaCuota || c.fecha < proximaCuota.fecha) proximaCuota = c
        }
      })
    })
    return { deudaTotal, esteMes, activas, proximaCuota }
  }, [purchases])

  const activas   = purchases.filter(p => p.cuotas.some(c => c.fecha && c.fecha.substring(0, 7) > CUR_MONTH))
  const saldadas  = purchases.filter(p => !p.cuotas.some(c => c.fecha && c.fecha.substring(0, 7) > CUR_MONTH))
  const visibles  = mostrarSaldadas ? purchases : activas

  if (purchases.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>💳</div>
        <p style={{ fontWeight: 700, fontSize: 16 }}>No hay compras en cuotas</p>
        <p style={{ fontSize: 14, marginTop: 4 }}>Registrá una compra con tarjeta de crédito para verla acá</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <KpiCard label="Deuda pendiente" value={fmt(kpis.deudaTotal)} color="#7c3aed" icon="💳" />
        <KpiCard label="Este mes" value={fmt(kpis.esteMes)} color="#0284c7" icon="📅" />
        <KpiCard label="Compras activas" value={kpis.activas} color="#059669" icon="🛒" />
        {kpis.proximaCuota && (
          <KpiCard
            label="Próxima cuota"
            value={fmt(kpis.proximaCuota.monto)}
            sub={fmtMes(kpis.proximaCuota.fecha)}
            color="#d97706"
            icon="⏰"
          />
        )}
      </div>

      {/* ── Filtro saldadas ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {activas.length} compra{activas.length !== 1 ? 's' : ''} activa{activas.length !== 1 ? 's' : ''}
          {saldadas.length > 0 && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: 8 }}>
              · {saldadas.length} saldada{saldadas.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        {saldadas.length > 0 && (
          <button
            onClick={() => setMostrarSaldadas(v => !v)}
            style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 99,
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600,
            }}
          >
            {mostrarSaldadas ? 'Ocultar saldadas' : 'Ver saldadas'}
          </button>
        )}
      </div>

      {/* ── Lista de compras ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            No hay compras activas en cuotas
          </div>
        ) : (
          visibles.map(p => (
            <PurchaseCard
              key={p.compra_id}
              p={p}
              isExpanded={expanded.has(p.compra_id)}
              onToggle={() => toggle(p.compra_id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
