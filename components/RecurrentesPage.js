'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'
import { fmt, fmtDate, uniq } from '../lib/constants'
import { useCategories } from '../lib/useCategories'
import { useApp } from '../context/AppContext'
import {
  IconRecurrentes, IconPlus, IconEditar, IconEliminar, IconCerrar,
  IconGuardar, IconExito, IconAdvertencia, IconCalendario,
  IconConfig, IconSpinner, IconCheck,
} from '../lib/icons'

const FRECUENCIAS = [
  { val:'diaria',    label:'Diaria',         Icon: IconCalendario },
  { val:'semanal',   label:'Semanal',        Icon: IconCalendario },
  { val:'quincenal', label:'Quincenal',      Icon: IconCalendario },
  { val:'mensual',   label:'Mensual',        Icon: IconCalendario },
  { val:'custom',    label:'Personalizado',  Icon: IconConfig     },
]

function calcProxima(r) {
  const base = new Date(r.ultimo_proceso || r.fecha_inicio)
  let dias = 30
  if (r.frecuencia==='diaria')    dias=1
  if (r.frecuencia==='semanal')   dias=7
  if (r.frecuencia==='quincenal') dias=15
  if (r.frecuencia==='custom')    dias=r.intervalo_dias||30
  base.setDate(base.getDate()+dias)
  return base
}

export default function RecurrentesPage() {
  const { fmtMoney } = useApp()
  const supabase = createClient()
  const [list, setList]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('recurring_expenses').select('*').order('created_at',{ascending:false})
    setList(data||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    await supabase.from('recurring_expenses').delete().eq('id',id)
    setList(p=>p.filter(r=>r.id!==id))
    setConfirmDelete(null)
  }

  const handleToggle = async (r) => {
    const { data } = await supabase.from('recurring_expenses').update({ activo:!r.activo }).eq('id',r.id).select().single()
    if (data) setList(p=>p.map(x=>x.id===r.id?data:x))
  }

  const S = {
    card:     { background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--shadow)', border:'1px solid var(--border)', marginBottom:12 },
    tag:      { padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 },
    btnIcon:  { border:'none', background:'none', cursor:'pointer', padding:'5px', borderRadius:7, color:'var(--text-muted)', display:'inline-flex' },
    btnPrim:  { padding:'10px 20px', borderRadius:10, border:'none', background:'var(--accent)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
    btnGhost: { padding:'10px 18px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  }

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <IconSpinner size={32} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" />
      <span style={{ fontWeight:600, fontSize:13 }}>Cargando…</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      {/* Modal eliminar */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} role="dialog" aria-modal="true">
          <div style={{ background:'var(--surface)', borderRadius:16, padding:32, maxWidth:340, width:'90%', textAlign:'center' }}>
            <IconEliminar size={40} weight="duotone" color="#ef4444" style={{ marginBottom:12 }} aria-hidden="true" />
            <h3 style={{ margin:'0 0 8px', color:'var(--text-primary)' }}>¿Eliminar recurrente?</h3>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:24 }}>Los gastos ya generados se conservarán.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setConfirmDelete(null)} style={S.btnGhost}>Cancelar</button>
              <button onClick={()=>handleDelete(confirmDelete)} style={{ ...S.btnPrim, background:'#ef4444' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
            <IconRecurrentes size={24} weight="duotone" color="var(--accent)" aria-hidden="true" />
            Gastos Recurrentes
          </h2>
          <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:13 }}>
            {list.length} configurados · {list.filter(r=>r.activo).length} activos
          </p>
        </div>
        <button onClick={()=>{ setEditing(null); setShowForm(true) }} style={S.btnPrim}>
          <IconPlus size={16} aria-hidden="true" /> Nuevo recurrente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <RecurrenteForm
          initial={editing}
          onSave={async (data) => {
            if (data.id) {
              const { data:updated } = await supabase.from('recurring_expenses').update(data).eq('id',data.id).select().single()
              if (updated) setList(p=>p.map(x=>x.id===updated.id?updated:x))
            } else {
              const { data:{ user } } = await supabase.auth.getUser()
              const { data:created } = await supabase.from('recurring_expenses').insert({ ...data, user_id:user.id }).select().single()
              if (created) setList(p=>[created,...p])
            }
            setShowForm(false); setEditing(null)
          }}
          onCancel={()=>{ setShowForm(false); setEditing(null) }}
        />
      )}

      {/* Lista */}
      {list.length === 0 && !showForm && (
        <div style={{ textAlign:'center', padding:'64px 20px', color:'var(--text-muted)' }}>
          <IconRecurrentes size={64} weight="duotone" color="var(--text-muted)" style={{ marginBottom:12 }} aria-hidden="true" />
          <p style={{ fontWeight:700, fontSize:16, color:'var(--text-secondary)' }}>Sin gastos recurrentes</p>
          <p style={{ fontSize:13, marginTop:4 }}>Creá uno para automatizar tus gastos fijos</p>
        </div>
      )}

      {list.map(r => {
        const proxima = r.activo ? calcProxima(r) : null
        const freqItem = FRECUENCIAS.find(f=>f.val===r.frecuencia)||FRECUENCIAS[3]
        const FreqIcon = freqItem.Icon
        return (
          <div key={r.id} style={S.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:200 }}>
                {/* Categoría */}
                <div style={{ fontWeight:800, fontSize:15, color:'var(--text-primary)', marginBottom:4 }}>{r.n4}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{r.n1} › {r.n2} › {r.n3}</div>

                {/* Tags de info */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                  <span style={{ ...S.tag, background:r.activo?'#dcfce7':'#f1f5f9', color:r.activo?'#166534':'#64748b', display:'flex', alignItems:'center', gap:4 }}>
                    {r.activo
                      ? <><IconCheck size={10} weight="bold" aria-hidden="true" /> Activo</>
                      : 'Pausado'}
                  </span>
                  <span style={{ ...S.tag, background:'var(--surface2)', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
                    <FreqIcon size={11} aria-hidden="true" />
                    {freqItem.label}{r.frecuencia==='custom'?` (c/${r.intervalo_dias}d)`:''}
                  </span>
                  <span style={{ ...S.tag, background:'#eff6ff', color:'#1d4ed8', fontWeight:800 }}>
                    {fmtMoney?fmtMoney(r.monto):fmt(r.monto)}
                  </span>
                  {proxima && r.activo && (
                    <span style={{ ...S.tag, background:'#fefce8', color:'#854d0e', display:'flex', alignItems:'center', gap:4 }}>
                      <IconCalendario size={11} aria-hidden="true" />
                      Próxima: {fmtDate(proxima.toISOString().split('T')[0])}
                    </span>
                  )}
                  {r.ultimo_proceso && (
                    <span style={{ ...S.tag, background:'var(--surface2)', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                      <IconCheck size={10} weight="bold" aria-hidden="true" />
                      Última: {fmtDate(r.ultimo_proceso)}
                    </span>
                  )}
                  {!r.ultimo_proceso && (
                    <span style={{ ...S.tag, background:'#fffbeb', color:'#92400e', display:'flex', alignItems:'center', gap:4 }}>
                      <IconAdvertencia size={11} aria-hidden="true" /> Sin procesar aún
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <button onClick={()=>handleToggle(r)} aria-label={r.activo?'Pausar recurrente':'Activar recurrente'}
                  style={{ ...S.btnIcon, color:r.activo?'#f59e0b':'#10b981', padding:'6px 10px', fontSize:12, fontWeight:700, border:'1px solid var(--border)', borderRadius:8 }}>
                  {r.activo ? 'Pausar' : 'Activar'}
                </button>
                <button onClick={()=>{ setEditing(r); setShowForm(true) }} aria-label="Editar recurrente" style={S.btnIcon}>
                  <IconEditar size={15} aria-hidden="true" />
                </button>
                <button onClick={()=>setConfirmDelete(r.id)} aria-label="Eliminar recurrente" style={{ ...S.btnIcon, color:'#ef4444' }}>
                  <IconEliminar size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Formulario de recurrente ───────────────────────────────────────────────────
function RecurrenteForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const blank = { n1:'', n2:'', n3:'', n4:'', monto:'', unidad:'unidad', frecuencia:'mensual', intervalo_dias:30, fecha_inicio:today, fecha_fin:'', activo:true, observaciones:'' }
  const [form, setForm]   = useState(initial ? { ...initial } : blank)
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const { categories } = useCategories()
  const opts_n1 = uniq(categories.map(c=>c.n1)).filter(Boolean).sort()
  const opts_n2 = uniq(categories.filter(c=>c.n1===form.n1).map(c=>c.n2)).filter(Boolean).sort()
  const opts_n3 = uniq(categories.filter(c=>c.n1===form.n1&&c.n2===form.n2).map(c=>c.n3)).filter(Boolean).sort()
  const opts_n4 = uniq(categories.filter(c=>c.n1===form.n1&&c.n2===form.n2&&c.n3===form.n3).map(c=>c.n4)).filter(Boolean).sort()

  const valid = form.n1&&form.n2&&form.n3&&form.n4&&form.monto&&form.fecha_inicio

  const inp = { padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--surface)', outline:'none', width:'100%', color:'var(--text-primary)', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }

  return (
    <div style={{ background:'var(--surface2)', borderRadius:14, padding:24, marginBottom:20, border:'1.5px solid var(--accent)' }}>
      <h3 style={{ margin:'0 0 20px', fontSize:16, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
        {initial
          ? <><IconEditar size={18} weight="duotone" color="var(--accent)" aria-hidden="true" /> Editar recurrente</>
          : <><IconPlus size={18} weight="duotone" color="var(--accent)" aria-hidden="true" /> Nuevo gasto recurrente</>}
      </h3>

      {/* Cascada de categoría */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { label:'Tipo (N1)',         key:'n1', opts:opts_n1, deps:[]                         },
          { label:'Área (N2)',         key:'n2', opts:opts_n2, deps:[!form.n1]                  },
          { label:'Subcategoría (N3)', key:'n3', opts:opts_n3, deps:[!form.n1,!form.n2]         },
          { label:'Ítem (N4)',         key:'n4', opts:opts_n4, deps:[!form.n1,!form.n2,!form.n3]},
        ].map(({ label, key, opts, deps }) => (
          <div key={key}>
            <label style={lbl}>{label}</label>
            <select value={form[key]} onChange={e=>set(key,e.target.value)} disabled={deps.some(Boolean)} style={{ ...inp, opacity:deps.some(Boolean)?0.5:1 }} aria-label={label}>
              <option value="">Seleccionar…</option>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Monto, frecuencia, fechas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
        <div><label style={lbl}>Monto ($)</label><input type="number" min="0" step="1" value={form.monto} onChange={e=>set('monto',e.target.value)} style={inp} /></div>
        <div>
          <label style={lbl}>Frecuencia</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FRECUENCIAS.map(({ val, label, Icon: FIc }) => (
              <button key={val} onClick={()=>set('frecuencia',val)} type="button" aria-pressed={form.frecuencia===val}
                style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${form.frecuencia===val?'var(--accent)':'var(--border)'}`, background:form.frecuencia===val?'var(--accent-light)':'var(--surface)', color:form.frecuencia===val?'var(--accent)':'var(--text-secondary)', fontWeight:700, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <FIc size={11} weight={form.frecuencia===val?'fill':'regular'} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {form.frecuencia==='custom' && (
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>Cada</span>
              <input type="number" min="1" max="365" value={form.intervalo_dias} onChange={e=>set('intervalo_dias',parseInt(e.target.value)||1)} style={{ ...inp, width:70 }} aria-label="Días de intervalo" />
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>días</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <div><label style={lbl}>Fecha inicio</label><input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Fecha fin (opcional)</label><input type="date" value={form.fecha_fin||''} onChange={e=>set('fecha_fin',e.target.value)} style={inp} /></div>
      </div>

      <div style={{ marginBottom:20 }}>
        <label style={lbl}>Notas</label>
        <input type="text" value={form.observaciones||''} onChange={e=>set('observaciones',e.target.value)} placeholder="Notas opcionales…" style={inp} />
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} type="button"
          style={{ padding:'10px 20px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <IconCerrar size={14} aria-hidden="true" /> Cancelar
        </button>
        <button onClick={async()=>{ if(!valid||saving)return; setSaving(true); await onSave({ ...form, monto:parseFloat(form.monto), intervalo_dias:parseInt(form.intervalo_dias)||30, fecha_fin:form.fecha_fin||null, ...(initial?{id:initial.id}:{}) }); setSaving(false) }}
          disabled={!valid||saving} type="button"
          style={{ padding:'10px 24px', borderRadius:10, border:'none', background:valid?'var(--accent)':'var(--border)', color:valid?'#fff':'var(--text-muted)', fontWeight:700, fontSize:13, cursor:valid?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
          {saving
            ? <><IconSpinner size={14} style={{ animation:'spin 1s linear infinite' }} aria-hidden="true" /> Guardando…</>
            : initial
              ? <><IconGuardar size={14} aria-hidden="true" /> Guardar</>
              : <><IconExito  size={14} aria-hidden="true" /> Crear</>}
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </button>
      </div>
    </div>
  )
}
