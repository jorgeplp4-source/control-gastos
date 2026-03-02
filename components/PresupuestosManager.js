'use client'
import { useState } from 'react'
import { fmt } from '../lib/constants'
import { useApp } from '../context/AppContext'
import { usePresupuestos } from '../lib/usePresupuestos'
import { N1_COLORS } from '../lib/constants'
import { IconEliminar, IconExito } from '../lib/icons'

const N1_OPCIONES = ['Fijos','Variables','Extraordinarios','Imprevistos','Total general']

export default function PresupuestosManager() {
  const { fmtMoney } = useApp()
  const money = v => fmtMoney ? fmtMoney(v) : fmt(v)
  const { presupuestos, refetch } = usePresupuestos()
  const [form,    setForm]    = useState({ nivel:'n1', categoria:'Variables', monto:'' })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const set = (k,v) => setForm(p => ({...p, [k]:v}))

  const handleAdd = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return
    setSaving(true)
    const nivel = form.categoria === 'Total general' ? 'total' : 'n1'
    const categoria = form.categoria === 'Total general' ? 'total' : form.categoria
    await fetch('/api/presupuestos', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ nivel, categoria, monto: parseFloat(form.monto) }),
    })
    await refetch()
    setForm(p => ({ ...p, monto:'' }))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = async (id) => {
    await fetch(`/api/presupuestos?id=${id}`, { method:'DELETE' })
    await refetch()
  }

  const inp = { padding:'9px 14px', border:'1.5px solid var(--border)', borderRadius:10,
    fontSize:14, background:'var(--surface)', outline:'none', color:'var(--text-primary)',
    fontFamily:'inherit', width:'100%', boxSizing:'border-box' }
  const sel = { ...inp, cursor:'pointer', appearance:'none', paddingRight:28,
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }

  return (
    <div>
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:18, marginTop:0 }}>
        Definí límites de gasto por tipo de categoría. Se generarán alertas cuando te acerques o superes el límite.
      </p>

      {/* Formulario para agregar */}
      <div style={{ background:'var(--surface2)', borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
          letterSpacing:'.06em', marginBottom:12 }}>Agregar presupuesto</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, alignItems:'end' }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:5 }}>Categoría</label>
            <select value={form.categoria} onChange={e=>set('categoria',e.target.value)} style={sel}>
              {N1_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:5 }}>Límite mensual ($)</label>
            <input type="number" min="0" step="1000" value={form.monto}
              onChange={e=>set('monto',e.target.value)} placeholder="Ej: 50000" style={inp}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}/>
          </div>
          <button onClick={handleAdd} disabled={saving || !form.monto}
            style={{ padding:'9px 18px', borderRadius:9, border:'none', cursor:'pointer',
              background: form.monto ? 'linear-gradient(135deg,var(--accent),#6366f1bb)' : 'var(--border)',
              color: form.monto ? '#fff' : 'var(--text-muted)', fontSize:13, fontWeight:800,
              display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            {saved ? <><IconExito size={14}/> Guardado</> : saving ? 'Guardando…' : '+ Agregar'}
          </button>
        </div>
      </div>

      {/* Lista de presupuestos */}
      {presupuestos.length === 0 ? (
        <div style={{ textAlign:'center', padding:'28px 20px', color:'var(--text-muted)', fontSize:13 }}>
          Sin presupuestos configurados. Agregá uno arriba para activar las alertas.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {presupuestos.map(p => {
            const color = p.nivel === 'total' ? '#6366f1' : (N1_COLORS[p.categoria]||{}).bg || '#6366f1'
            const label = p.nivel === 'total' ? 'Total general' : p.categoria
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
                borderLeft:`3px solid ${color}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>Mensual · Alerta al 80% y 100%</div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, color }}>
                  {money(p.monto)}
                </div>
                <button onClick={() => handleDelete(p.id)}
                  style={{ border:'none', background:'none', cursor:'pointer',
                    color:'var(--text-muted)', padding:6, borderRadius:7 }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <IconEliminar size={14}/>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
