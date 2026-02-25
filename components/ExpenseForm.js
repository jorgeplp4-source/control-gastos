'use client'
import { useState } from 'react'
import { UNITS } from '../lib/constants'
import CategorySearch from './CategorySearch'
import ItemSearch from './ItemSearch'
import {
  IconEditar, IconRegistrar, IconCerrar, IconGuardar,
  IconExito, IconRecurrentes, IconConfig, IconCalendario, IconInfo,
} from '../lib/icons'

// Ícono Phosphor para cada frecuencia
const FRECUENCIAS = [
  { val:'mensual',   label:'Mensual',   Icon: IconCalendario },
  { val:'quincenal', label:'Quincenal', Icon: IconCalendario },
  { val:'semanal',   label:'Semanal',   Icon: IconCalendario },
  { val:'custom',    label:'Otro',      Icon: IconConfig     },
]

export default function ExpenseForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const blank = { n1:'', n2:'', n3:'', n4:'', cantidad:'', unidad:'unidad', monto:'', fecha:today, observaciones:'' }
  const [form, setForm]           = useState(initial ? { ...initial } : blank)
  const [selectedItem, setSelectedItem] = useState(null)   // ítem seleccionado desde ItemSearch
  const [saving, setSaving]       = useState(false)
  const [hacerRec, setHacerRec]   = useState(false)
  const [recForm, setRecForm]     = useState({ frecuencia:'mensual', intervalo_dias:30, fecha_inicio:today, fecha_fin:'', activo:true })

  const setRec = (k, v) => setRecForm(p => ({ ...p, [k]:v }))
  const set    = (k, v) => setForm(p => ({ ...p, [k]:v }))

  const handleCategoryChange = (cat) =>
    setForm(p => ({ ...p, n1:cat.n1||'', n2:cat.n2||'', n3:cat.n3||'', n4:cat.n4||'' }))

  // Cuando el usuario selecciona un ítem desde ItemSearch:
  // — si tiene categoría asociada, la propaga al formulario
  // — siempre registra el ítem seleccionado
  const handleItemChange = (item) => {
    setSelectedItem(item)
    if (item && item.n4) {
      setForm(p => ({ ...p, n1:item.n1||p.n1, n2:item.n2||p.n2, n3:item.n3||p.n3, n4:item.n4||p.n4 }))
    }
  }

  // Autocompleta la unidad cuando el ítem tiene unidad_default
  // El usuario puede cambiarla manualmente — eso NO modifica el default del ítem
  const handleUnitFromItem = (unidad) => {
    if (unidad) set('unidad', unidad)
  }

  const valid = form.n1 && form.n2 && form.n3 && form.n4 && form.cantidad && form.monto && form.fecha

  const handleSubmit = async () => {
    if (!valid || saving) return
    setSaving(true)
    const gasto = { ...form, cantidad:parseFloat(form.cantidad), monto:parseFloat(form.monto), ...(initial?{id:initial.id}:{}) }
    if (hacerRec && !initial) {
      gasto._recurrente = { ...recForm, intervalo_dias:parseInt(recForm.intervalo_dias)||30, fecha_fin:recForm.fecha_fin||null }
    }
    await onSave(gasto)
    setSaving(false)
  }

  // Colores activos según categoría N1 seleccionada
  const { N1_COLORS } = require('../lib/constants')
  const activeColor = (N1_COLORS[form.n1]||{}).bg || '#3b82f6'

  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface)', outline:'none', width:'100%', color:'var(--text-primary)', fontFamily:'inherit' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }
  const sel = { ...inp, cursor:'pointer', appearance:'none', paddingRight:28, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ background:'var(--surface)', borderRadius:20, overflow:'hidden', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
        <div style={{ height:5, background:`linear-gradient(90deg,${activeColor},${activeColor}88)` }} />
        <div style={{ padding:'28px 32px' }}>

          {/* Título */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
              {initial
                ? <><IconEditar size={20} weight="duotone" color={activeColor} aria-hidden="true" /> Editar Gasto</>
                : <><IconRegistrar size={20} weight="duotone" color={activeColor} aria-hidden="true" /> Nuevo Gasto</>}
            </h2>
            {initial && (
              <button onClick={onCancel} aria-label="Cancelar edición"
                style={{ border:'none', background:'none', color:'var(--text-muted)', cursor:'pointer', display:'flex', padding:4 }}>
                <IconCerrar size={22} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Búsqueda de categorías */}
          <div style={{ background:'var(--surface2)', borderRadius:14, padding:20, marginBottom:22, border:'1px solid var(--border)' }}>
            <CategorySearch
              value={{ n1:form.n1, n2:form.n2, n3:form.n3, n4:form.n4 }}
              onChange={handleCategoryChange}
            />
          </div>

          {/* Búsqueda de ítem específico */}
          <div style={{ marginBottom:22 }}>
            <ItemSearch
              value={selectedItem}
              onChange={handleItemChange}
              onUnitChange={handleUnitFromItem}
              category={{ n1:form.n1, n2:form.n2, n3:form.n3, n4:form.n4 }}
            />
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:'5px 0 0', fontStyle:'italic' }}>
              Opcional — asociá un ítem para autocompletar la unidad y reutilizarlo en registros futuros
            </p>
          </div>

          {/* Campos principales */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))', gap:16 }}>
            <div><label style={lbl}>Cantidad</label><input type="number" min="0" step="0.01" value={form.cantidad} onChange={e=>set('cantidad',e.target.value)} placeholder="0" style={inp} /></div>
            <div><label style={lbl}>Unidad</label><select value={form.unidad} onChange={e=>set('unidad',e.target.value)} style={sel}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
            <div><label style={lbl}>Monto ($)</label><input type="number" min="0" step="1" value={form.monto} onChange={e=>set('monto',e.target.value)} placeholder="0" style={inp} /></div>
            <div><label style={lbl}>Fecha</label><input type="date" value={form.fecha} onChange={e=>set('fecha',e.target.value)} style={inp} /></div>
          </div>

          <div style={{ marginTop:16 }}>
            <label style={lbl}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e=>set('observaciones',e.target.value)} placeholder="Notas adicionales…" rows={2} style={{ ...inp, resize:'vertical' }} />
          </div>

          {/* Toggle recurrente */}
          {!initial && (
            <div style={{ marginTop:20, borderRadius:14, border:`1.5px solid ${hacerRec ? activeColor : 'var(--border)'}`, overflow:'hidden', transition:'border-color .2s' }}>
              <label style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer', background:hacerRec?`${activeColor}12`:'var(--surface2)', transition:'background .2s', userSelect:'none' }}>
                {/* Toggle switch */}
                <div style={{ position:'relative', width:44, height:24, flexShrink:0, cursor:'pointer' }} onClick={() => setHacerRec(p=>!p)} role="switch" aria-checked={hacerRec} tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setHacerRec(p=>!p)} aria-label="Hacer recurrente">
                  <div style={{ position:'absolute', inset:0, borderRadius:12, background:hacerRec?activeColor:'var(--border)', transition:'background .2s' }} />
                  <div style={{ position:'absolute', top:3, left:hacerRec?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.25)', transition:'left .2s' }} />
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                    <IconRecurrentes size={16} weight={hacerRec?'fill':'regular'} color={hacerRec?activeColor:'var(--text-muted)'} aria-hidden="true" />
                    Hacer recurrente
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                    {hacerRec ? 'Se guardará como gasto automático periódico' : 'Activá para repetición automática'}
                  </div>
                </div>
              </label>

              {hacerRec && (
                <div style={{ padding:'16px 18px', borderTop:`1px solid ${activeColor}30`, background:'var(--surface)' }}>
                  <div style={{ marginBottom:14 }}>
                    <label style={lbl}>Frecuencia</label>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {FRECUENCIAS.map(({ val, label, Icon: Ic }) => (
                        <button key={val} onClick={() => setRec('frecuencia', val)}
                          aria-pressed={recForm.frecuencia===val}
                          style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${recForm.frecuencia===val?activeColor:'var(--border)'}`, background:recForm.frecuencia===val?`${activeColor}15`:'var(--surface)', color:recForm.frecuencia===val?activeColor:'var(--text-secondary)', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          <Ic size={13} weight={recForm.frecuencia===val?'fill':'regular'} aria-hidden="true" />
                          {label}
                        </button>
                      ))}
                    </div>
                    {recForm.frecuencia==='custom' && (
                      <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>Cada</span>
                        <input type="number" min="1" max="365" value={recForm.intervalo_dias} onChange={e=>setRec('intervalo_dias',e.target.value)} style={{ ...inp, width:80 }} aria-label="Intervalo en días" />
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>días</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div><label style={lbl}>Fecha inicio</label><input type="date" value={recForm.fecha_inicio} onChange={e=>setRec('fecha_inicio',e.target.value)} style={inp} /></div>
                    <div><label style={lbl}>Fecha fin (opcional)</label><input type="date" value={recForm.fecha_fin} onChange={e=>setRec('fecha_fin',e.target.value)} style={inp} /></div>
                  </div>
                  <div style={{ marginTop:10, display:'flex', alignItems:'flex-start', gap:6 }}>
                    <IconInfo size={14} color="var(--text-muted)" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true" />
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, fontStyle:'italic' }}>
                      Podés editarlo o pausarlo desde Configuración → Gastos Recurrentes
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div style={{ marginTop:24, display:'flex', gap:10, justifyContent:'flex-end' }}>
            {initial && (
              <button onClick={onCancel}
                style={{ padding:'11px 24px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:14, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <IconCerrar size={15} aria-hidden="true" /> Cancelar
              </button>
            )}
            <button onClick={handleSubmit} disabled={!valid||saving}
              aria-disabled={!valid||saving}
              style={{ padding:'11px 32px', borderRadius:10, border:'none', cursor:valid&&!saving?'pointer':'not-allowed', background:valid?`linear-gradient(135deg,${activeColor},${activeColor}bb)`:'var(--border)', color:valid?'#fff':'var(--text-muted)', fontSize:14, fontWeight:800, boxShadow:valid?`0 4px 14px ${activeColor}44`:'none', display:'flex', alignItems:'center', gap:8 }}>
              {saving
                ? <><IconRecurrentes size={15} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" /> Guardando…</>
                : initial
                  ? <><IconGuardar size={15} aria-hidden="true" /> Guardar Cambios</>
                  : hacerRec
                    ? <><IconExito size={15} aria-hidden="true" /> Registrar + Recurrencia</>
                    : <><IconExito size={15} aria-hidden="true" /> Registrar Gasto</>}
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
