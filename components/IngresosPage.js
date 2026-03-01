'use client'
import { useState, useMemo } from 'react'
import { fmt, fmtDate } from '../lib/constants'
import { useApp } from '../context/AppContext'
import { useIngresos } from '../lib/useIngresos'
import {
  IconCerrar, IconGuardar, IconEditar, IconEliminar,
  IconExito, IconRecurrentes, IconCalendario, IconDinero,
} from '../lib/icons'

const today = () => new Date().toISOString().split('T')[0]

const TIPOS   = ['fijo', 'variable']
const PERIODOS = ['mensual','quincenal','semanal','único']
const FUENTES_SUGERIDAS = ['Sueldo','Freelance','Alquiler','Honorarios','Bono','Jubilación','Inversiones','Otro']

const TIPO_COLOR = { fijo: '#1e40af', variable: '#d97706' }

function Badge({ text, color }) {
  return (
    <span style={{ padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700,
      background:`${color}18`, color, border:`1px solid ${color}33` }}>
      {text}
    </span>
  )
}

// ── Formulario de ingreso ─────────────────────────────────────────────────────
function IngresoForm({ initial, onSave, onCancel }) {
  const blank = { fuente:'Sueldo', monto:'', fecha:today(), tipo:'fijo', periodo:'mensual', notas:'' }
  const [form, setForm] = useState(initial ? { ...initial, monto: String(initial.monto) } : blank)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.fuente.trim() && parseFloat(form.monto) > 0 && form.fecha

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    await onSave({ ...form, monto: parseFloat(form.monto) })
    setSaving(false)
  }

  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10,
    fontSize:14, background:'var(--surface)', outline:'none', width:'100%',
    color:'var(--text-primary)', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)',
    marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }
  const sel = { ...inp, cursor:'pointer', appearance:'none', paddingRight:28,
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }

  return (
    <div style={{ background:'var(--surface)', border:'1.5px solid var(--accent)', borderRadius:16,
      padding:22, marginBottom:20, boxShadow:'0 4px 20px rgba(99,102,241,.12)' }}>
      <h3 style={{ margin:'0 0 18px', fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>
        {initial ? '✏️ Editar ingreso' : '➕ Nuevo ingreso'}
      </h3>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Fuente */}
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Fuente de ingreso</label>
          <input list="fuentes-list" value={form.fuente} onChange={e=>set('fuente',e.target.value)}
            placeholder="Ej: Sueldo, Freelance…" style={inp}/>
          <datalist id="fuentes-list">
            {FUENTES_SUGERIDAS.map(f => <option key={f} value={f}/>)}
          </datalist>
        </div>

        {/* Monto */}
        <div>
          <label style={lbl}>Monto ($)</label>
          <input type="number" min="0" step="1" value={form.monto}
            onChange={e=>set('monto',e.target.value)} placeholder="0" style={inp}/>
        </div>

        {/* Fecha */}
        <div>
          <label style={lbl}>Fecha</label>
          <input type="date" value={form.fecha} onChange={e=>set('fecha',e.target.value)} style={inp}/>
        </div>

        {/* Tipo */}
        <div>
          <label style={lbl}>Tipo</label>
          <select value={form.tipo} onChange={e=>set('tipo',e.target.value)} style={sel}>
            {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>

        {/* Período */}
        <div>
          <label style={lbl}>Frecuencia</label>
          <select value={form.periodo} onChange={e=>set('periodo',e.target.value)} style={sel}>
            {PERIODOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </div>

        {/* Notas */}
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Notas (opcional)</label>
          <input value={form.notas} onChange={e=>set('notas',e.target.value)}
            placeholder="Ej: incluye bono de productividad" style={inp}/>
        </div>
      </div>

      <div style={{ marginTop:18, display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onCancel}
          style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid var(--border)',
            background:'var(--surface)', fontSize:13, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer',
            display:'flex', alignItems:'center', gap:5 }}>
          <IconCerrar size={14}/> Cancelar
        </button>
        <button onClick={handleSave} disabled={!valid||saving}
          style={{ padding:'9px 22px', borderRadius:9, border:'none', cursor:valid&&!saving?'pointer':'not-allowed',
            background:valid?'linear-gradient(135deg,#1e40af,#3b82f6)':'var(--border)',
            color:valid?'#fff':'var(--text-muted)', fontSize:13, fontWeight:800,
            display:'flex', alignItems:'center', gap:6 }}>
          <IconGuardar size={14}/> {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Agregar ingreso'}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function IngresosPage() {
  const { fmtMoney } = useApp()
  const money = v => fmtMoney ? fmtMoney(v) : fmt(v)
  const { ingresos, refetch } = useIngresos()
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [filterMes,  setFilterMes]  = useState(() => new Date().toISOString().slice(0,7)) // YYYY-MM

  // Filtrar por mes seleccionado
  const filtered = useMemo(() =>
    ingresos.filter(i => i.fecha.startsWith(filterMes)),
    [ingresos, filterMes]
  )

  // KPIs del mes
  const totalMes   = filtered.reduce((s,i) => s + (i.monto||0), 0)
  const totalFijo  = filtered.filter(i=>i.tipo==='fijo').reduce((s,i)=>s+(i.monto||0),0)
  const totalVar   = filtered.filter(i=>i.tipo==='variable').reduce((s,i)=>s+(i.monto||0),0)

  // Meses disponibles para el selector
  const meses = useMemo(() => {
    const set = new Set(ingresos.map(i => i.fecha.slice(0,7)))
    const now  = new Date().toISOString().slice(0,7)
    set.add(now)
    return [...set].sort((a,b)=>b.localeCompare(a)).slice(0,12)
  }, [ingresos])

  const handleSave = async (form) => {
    const isEdit = !!editTarget
    await fetch('/api/ingresos', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(isEdit ? { ...form, id: editTarget.id } : form),
    })
    refetch()
    setShowForm(false); setEditTarget(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este ingreso?')) return
    await fetch(`/api/ingresos?id=${id}`, { method:'DELETE' })
    refetch()
  }

  const handleEdit = (ing) => { setEditTarget(ing); setShowForm(true) }

  // Agrupar por fuente para el resumen
  const porFuente = useMemo(() => {
    const m = {}
    filtered.forEach(i => {
      if (!m[i.fuente]) m[i.fuente] = { fuente:i.fuente, monto:0, tipo:i.tipo, count:0 }
      m[i.fuente].monto += i.monto||0
      m[i.fuente].count++
    })
    return Object.values(m).sort((a,b)=>b.monto-a.monto)
  }, [filtered])

  const card = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14,
    padding:'18px 20px', flex:1, minWidth:140 }
  const mesLabel = (m) => {
    const [y,mo] = m.split('-')
    return new Date(+y, +mo-1, 1).toLocaleDateString('es-AR', { month:'long', year:'numeric' })
  }

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'0 0 40px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--text-primary)',
            display:'flex', alignItems:'center', gap:8 }}>
            <IconDinero size={22} weight="duotone" color="#1e40af"/> Ingresos
          </h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-muted)' }}>
            Registrá tus fuentes de ingreso para calcular métricas de ahorro
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Selector de mes */}
          <select value={filterMes} onChange={e=>setFilterMes(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:9, border:'1.5px solid var(--border)',
              background:'var(--surface2)', color:'var(--text-primary)', fontSize:13,
              fontWeight:600, cursor:'pointer' }}>
            {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          {!showForm && (
            <button onClick={() => { setShowForm(true); setEditTarget(null) }}
              style={{ padding:'9px 18px', borderRadius:9, border:'none', cursor:'pointer',
                background:'linear-gradient(135deg,#1e40af,#3b82f6)', color:'#fff',
                fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6,
                boxShadow:'0 3px 12px #1e40af44' }}>
              <IconExito size={15}/> Agregar ingreso
            </button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <IngresoForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {/* KPIs del mes */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <div style={{ ...card, borderTop:'3px solid #1e40af' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Total del mes</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#1e40af' }}>{money(totalMes)}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{filtered.length} registro{filtered.length!==1?'s':''}</div>
        </div>
        <div style={{ ...card, borderTop:'3px solid #3b82f6' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Ingresos fijos</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#3b82f6' }}>{money(totalFijo)}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{totalMes>0?Math.round(totalFijo/totalMes*100):0}% del total</div>
        </div>
        <div style={{ ...card, borderTop:'3px solid #d97706' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Ingresos variables</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#d97706' }}>{money(totalVar)}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{totalMes>0?Math.round(totalVar/totalMes*100):0}% del total</div>
        </div>
      </div>

      {/* Resumen por fuente */}
      {porFuente.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:18, marginBottom:20 }}>
          <h3 style={{ margin:'0 0 14px', fontSize:13, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>Por fuente</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {porFuente.map(f => (
              <div key={f.fuente} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{f.fuente}</span>
                    <Badge text={f.tipo} color={TIPO_COLOR[f.tipo]||'#64748b'}/>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:'var(--surface2)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${totalMes>0?f.monto/totalMes*100:0}%`,
                      background:`linear-gradient(90deg,#1e40af,#3b82f6)`, borderRadius:3, transition:'width .4s' }}/>
                  </div>
                </div>
                <span style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', minWidth:90, textAlign:'right' }}>
                  {money(f.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de registros */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>💰</div>
          <div style={{ fontSize:14, fontWeight:600 }}>Sin ingresos registrados este mes</div>
          <div style={{ fontSize:12, marginTop:4 }}>Agregá tu primer ingreso para ver métricas de ahorro</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(ing => (
            <div key={ing.id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${TIPO_COLOR[ing.tipo]||'#64748b'}18`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <IconDinero size={20} color={TIPO_COLOR[ing.tipo]||'#64748b'}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{ing.fuente}</span>
                  <Badge text={ing.tipo} color={TIPO_COLOR[ing.tipo]||'#64748b'}/>
                  <Badge text={ing.periodo} color="#64748b"/>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {fmtDate(ing.fecha)}{ing.notas ? ` · ${ing.notas}` : ''}
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:'#1e40af', marginRight:8 }}>
                {money(ing.monto)}
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={() => handleEdit(ing)}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)',
                    padding:6, borderRadius:7, transition:'background .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <IconEditar size={15}/>
                </button>
                <button onClick={() => handleDelete(ing.id)}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)',
                    padding:6, borderRadius:7, transition:'background .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <IconEliminar size={15}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
