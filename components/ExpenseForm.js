'use client'
import { useState, useCallback, useRef } from 'react'
import { N1_COLORS } from '../lib/constants'
import { useUnits } from '../lib/useUnits'
import { useItems } from '../lib/useItems'
import { useCategories } from '../lib/useCategories'
import { useVoiceInput, parseVoice, resolveVoice, speak } from '../lib/useVoiceInput'
import ItemSearch from './ItemSearch'
import {
  IconEditar, IconRegistrar, IconCerrar, IconGuardar,
  IconExito, IconRecurrentes, IconConfig, IconCalendario, IconInfo,
  IconMicrofono, IconMicrofonoOff,
} from '../lib/icons'

const FRECUENCIAS = [
  { val:'mensual',   label:'Mensual',   Icon: IconCalendario },
  { val:'quincenal', label:'Quincenal', Icon: IconCalendario },
  { val:'semanal',   label:'Semanal',   Icon: IconCalendario },
  { val:'custom',    label:'Otro',      Icon: IconConfig     },
]

const VOICE_STATES = {
  IDLE:      'idle',
  LISTENING: 'listening',
  SAVING:    'saving',
  DONE:      'done',
  ERROR:     'error',
}

// Badge de nivel de match
const MATCH_BADGE = {
  item:  { label:'Ítem',         color:'#6366f1' },
  n3:    { label:'Subcategoría', color:'#d97706' },
  n2:    { label:'Área',         color:'#059669' },
  n1:    { label:'Tipo',         color:'#1e40af' },
  libre: { label:'Libre',        color:'#64748b' },
}

function VoicePanel({ state, transcript, resolved, onDismiss }) {
  if (state === VOICE_STATES.IDLE) return null

  const cfg = {
    [VOICE_STATES.LISTENING]: { icon:'🎤', color:'#3b82f6', label:'Escuchando…',  sub:'Decí: nombre · cantidad · monto' },
    [VOICE_STATES.SAVING]:    { icon:'💾', color:'#22c55e', label:'Guardando…',    sub:'' },
    [VOICE_STATES.DONE]:      { icon:'✅', color:'#22c55e', label:'¡Registrado!',  sub:'' },
    [VOICE_STATES.ERROR]:     { icon:'⚠️', color:'#ef4444', label:'No entendí',    sub:'Intentá de nuevo' },
  }[state] || { icon:'🎤', color:'#3b82f6', label:'…', sub:'' }

  const mb = resolved?.matchLevel ? MATCH_BADGE[resolved.matchLevel] : null

  return (
    <div style={{ marginBottom:12, padding:'12px 14px', background:'var(--surface)', border:`2px solid ${cfg.color}`, borderRadius:12, animation:'micAppear .2s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:cfg.color }}>{cfg.label}</div>
            {cfg.sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{cfg.sub}</div>}
          </div>
        </div>
        {[VOICE_STATES.DONE, VOICE_STATES.ERROR].includes(state) && (
          <button onClick={onDismiss} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}>
            <IconCerrar size={12}/>
          </button>
        )}
      </div>

      {/* Lo que escuchó */}
      {transcript && state !== VOICE_STATES.LISTENING && (
        <div style={{ marginTop:8, padding:'6px 10px', background:'var(--surface2)', borderRadius:7, fontSize:12 }}>
          <span style={{ color:'var(--text-muted)' }}>Escuché: </span>
          <span style={{ fontWeight:700, fontStyle:'italic' }}>"{transcript}"</span>
        </div>
      )}

      {/* Resumen del gasto guardado */}
      {resolved && state === VOICE_STATES.DONE && (
        <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
          {mb && (
            <span style={{ padding:'2px 8px', borderRadius:99, background:`${mb.color}18`, color:mb.color, fontSize:10, fontWeight:800, border:`1px solid ${mb.color}33` }}>
              {mb.label}
            </span>
          )}
          {[
            { label:'',       val: resolved.n4 },
            { label:'$',      val: resolved.monto },
            { label:'',       val: resolved.n1 !== 'Sin definir' ? `· ${[resolved.n1,resolved.n2,resolved.n3].filter(Boolean).join(' › ')}` : '· Sin categoría' },
          ].filter(x=>x.val).map((x,i) => (
            <span key={i} style={{ fontSize:12, fontWeight: i===0?800:500, color: i===0?'var(--text-primary)':'var(--text-muted)' }}>
              {x.label}{x.val}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExpenseForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const { units }      = useUnits()
  const { items }      = useItems()
  const { categories } = useCategories()

  const blank = { n1:'', n2:'', n3:'', n4:'', cantidad:'', unidad:'unidad', monto:'', fecha:today, observaciones:'' }
  const [form,         setForm]         = useState(initial ? { ...initial } : blank)
  const [selectedItem, setSelectedItem] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [hacerRec,     setHacerRec]     = useState(false)
  const [recForm,      setRecForm]      = useState({ frecuencia:'mensual', intervalo_dias:30, fecha_inicio:today, fecha_fin:'', activo:true })

  const [voiceState,      setVoiceState]      = useState(VOICE_STATES.IDLE)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceResolved,   setVoiceResolved]   = useState(null)
  const voiceAbort = useRef(false)

  const setRec = (k, v) => setRecForm(p => ({ ...p, [k]:v }))
  const set    = (k, v) => setForm(p => ({ ...p, [k]:v }))

  const handleItemChange = useCallback((item) => {
    setSelectedItem(item)
    if (item) setForm(p => ({ ...p, n1:item.n1||p.n1, n2:item.n2||'', n3:item.n3||'', n4:item.nombre }))
    else setForm(p => ({ ...p, n4:'' }))
  }, [])
  const handleUnitFromItem = useCallback((u) => { if (u) set('unidad', u) }, [])

  const { listen, supported, setError: setSrError } = useVoiceInput({ lang:'es-AR' })

  // ── Guardar gasto desde datos resueltos ───────────────────────────────────
  const saveResolved = useCallback(async (resolved) => {
    setVoiceState(VOICE_STATES.SAVING)
    const gasto = {
      n1: resolved.n1 || 'Sin definir',
      n2: resolved.n2 || '',
      n3: resolved.n3 || '',
      n4: resolved.n4 || 'Gasto',
      cantidad:  parseFloat(resolved.cantidad) || 1,
      unidad:    'unidad',
      monto:     parseFloat(resolved.monto)    || 0,
      fecha:     today,
      observaciones: '',
    }
    // Actualizar form visualmente
    setForm(gasto)
    setSelectedItem(null)
    await onSave(gasto)
    setVoiceState(VOICE_STATES.DONE)
    setTimeout(() => {
      setVoiceState(VOICE_STATES.IDLE)
      setVoiceTranscript(''); setVoiceResolved(null)
    }, 3000)
  }, [today, onSave])

  // ── Circuito de voz ───────────────────────────────────────────────────────
  const runVoiceFlow = useCallback(async () => {
    if (!supported) { setSrError('Usá Chrome o Edge para usar el micrófono.'); return }
    voiceAbort.current = false
    setVoiceState(VOICE_STATES.LISTENING)
    setVoiceTranscript(''); setVoiceResolved(null)

    let transcript = ''
    try {
      transcript = await listen(t => setVoiceTranscript(t), { retries: 1 })
    } catch {
      setVoiceState(VOICE_STATES.ERROR)
      setTimeout(() => setVoiceState(VOICE_STATES.IDLE), 2500)
      return
    }
    if (voiceAbort.current) { setVoiceState(VOICE_STATES.IDLE); return }

    setVoiceTranscript(transcript)
    const parsed   = parseVoice(transcript)
    const resolved = resolveVoice(parsed, { items, categories })

    if (!resolved) {
      setVoiceState(VOICE_STATES.ERROR)
      setTimeout(() => setVoiceState(VOICE_STATES.IDLE), 2500)
      return
    }

    setVoiceResolved(resolved)
    await saveResolved(resolved)
    await speak('Registrado.')
  }, [supported, listen, items, categories, saveResolved])

  const handleMicClick = () => {
    if (voiceState !== VOICE_STATES.IDLE) {
      voiceAbort.current = true
      window.speechSynthesis?.cancel()
      setVoiceState(VOICE_STATES.IDLE)
      setVoiceTranscript(''); setVoiceResolved(null)
      return
    }
    runVoiceFlow()
  }

  const valid = form.n1 && form.n4 && form.cantidad && form.monto && form.fecha

  const handleSubmit = async () => {
    if (!valid || saving) return
    setSaving(true)
    const gasto = { ...form, cantidad:parseFloat(form.cantidad), monto:parseFloat(form.monto), ...(initial?{id:initial.id}:{}) }
    if (hacerRec && !initial) gasto._recurrente = { ...recForm, intervalo_dias:parseInt(recForm.intervalo_dias)||30, fecha_fin:recForm.fecha_fin||null }
    await onSave(gasto)
    setSaving(false)
  }

  const activeColor = (N1_COLORS[form.n1]||{}).bg || '#3b82f6'
  const micActive   = voiceState !== VOICE_STATES.IDLE
  const micBg       = voiceState === VOICE_STATES.DONE  ? '#22c55e'
                    : voiceState === VOICE_STATES.ERROR ? '#ef4444'
                    : '#3b82f6'

  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface)', outline:'none', width:'100%', color:'var(--text-primary)', fontFamily:'inherit' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }
  const sel = { ...inp, cursor:'pointer', appearance:'none', paddingRight:28, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <style>{`
        @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes micPulse  { 0%,100%{box-shadow:0 0 0 4px #3b82f630} 50%{box-shadow:0 0 0 14px #3b82f610} }
        @keyframes micAppear { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ background:'var(--surface)', borderRadius:20, overflow:'hidden', boxShadow:'var(--shadow-lg)', border:'1px solid var(--border)' }}>
        <div style={{ height:5, background:`linear-gradient(90deg,${activeColor},${activeColor}88)` }} />
        <div style={{ padding:'28px 32px' }}>

          {/* Título */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
              {initial
                ? <><IconEditar size={20} weight="duotone" color={activeColor}/> Editar Gasto</>
                : <><IconRegistrar size={20} weight="duotone" color={activeColor}/> Nuevo Gasto</>}
            </h2>
            {initial && <button onClick={onCancel} style={{ border:'none', background:'none', color:'var(--text-muted)', cursor:'pointer', display:'flex', padding:4 }}><IconCerrar size={22}/></button>}
          </div>

          {/* ── Bloque ítem + voz ── */}
          <div style={{ background:'var(--surface2)', borderRadius:14, padding:20, marginBottom:22, border:'1px solid var(--border)' }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>Ítem</span>
                {supported && !micActive && (
                  <span style={{ marginLeft:8, fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>
                    o 🎤 <strong style={{ fontStyle:'normal' }}>tipo/área/ítem · monto</strong>
                  </span>
                )}
              </div>
              {supported && (
                <button onClick={handleMicClick} title={micActive ? 'Cancelar' : 'Cargar por voz'}
                  style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0,
                    background: micBg, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: micActive ? 'none' : '0 2px 10px #3b82f644',
                    animation: voiceState===VOICE_STATES.LISTENING ? 'micPulse 1.4s ease-in-out infinite' : 'none',
                    transition:'background .2s, box-shadow .2s' }}>
                  {micActive ? <IconMicrofonoOff size={18}/> : <IconMicrofono size={18}/>}
                </button>
              )}
            </div>

            <VoicePanel
              state={voiceState} transcript={voiceTranscript} resolved={voiceResolved}
              onDismiss={() => { setVoiceState(VOICE_STATES.IDLE); setVoiceTranscript(''); setVoiceResolved(null) }}
            />

            <ItemSearch value={selectedItem} onChange={handleItemChange} onUnitChange={handleUnitFromItem}/>

            {form.n1 && !selectedItem && (
              <div style={{ marginTop:10, display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>Categoría:</span>
                {[form.n1, form.n2, form.n3].filter(Boolean).map((x,i,arr) => (
                  <span key={i} style={{ fontSize:11, fontWeight:700, color:(N1_COLORS[form.n1]||{}).text||'var(--accent)', display:'flex', alignItems:'center', gap:3 }}>
                    {x}{i<arr.length-1&&<span style={{ opacity:.4, marginLeft:3 }}>›</span>}
                  </span>
                ))}
              </div>
            )}
            {selectedItem && !form.n1 && (
              <p style={{ fontSize:11, color:'#d97706', marginTop:8, fontWeight:600 }}>⚠ Ítem sin categoría — editalo en Catálogo</p>
            )}
          </div>

          {/* Campos */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))', gap:16 }}>
            <div><label style={lbl}>Cantidad</label>
              <input type="number" min="0" step="0.01" value={form.cantidad} onChange={e=>set('cantidad',e.target.value)} placeholder="0" style={inp}/>
            </div>
            <div><label style={lbl}>Unidad</label>
              <select value={form.unidad} onChange={e=>set('unidad',e.target.value)} style={sel}>
                {units.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Monto ($)</label>
              <input type="number" min="0" step="1" value={form.monto} onChange={e=>set('monto',e.target.value)} placeholder="0" style={inp}/>
            </div>
            <div><label style={lbl}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e=>set('fecha',e.target.value)} style={inp}/>
            </div>
          </div>

          <div style={{ marginTop:16 }}>
            <label style={lbl}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e=>set('observaciones',e.target.value)} placeholder="Notas adicionales…" rows={2} style={{ ...inp, resize:'vertical' }}/>
          </div>

          {/* Recurrente */}
          {!initial && (
            <div style={{ marginTop:20, borderRadius:14, border:`1.5px solid ${hacerRec?activeColor:'var(--border)'}`, overflow:'hidden', transition:'border-color .2s' }}>
              <label style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer', background:hacerRec?`${activeColor}12`:'var(--surface2)', transition:'background .2s', userSelect:'none' }}>
                <div style={{ position:'relative', width:44, height:24, flexShrink:0, cursor:'pointer' }} onClick={()=>setHacerRec(p=>!p)} role="switch" aria-checked={hacerRec} tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setHacerRec(p=>!p)} aria-label="Hacer recurrente">
                  <div style={{ position:'absolute', inset:0, borderRadius:12, background:hacerRec?activeColor:'var(--border)', transition:'background .2s' }}/>
                  <div style={{ position:'absolute', top:3, left:hacerRec?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.25)', transition:'left .2s' }}/>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                    <IconRecurrentes size={16} weight={hacerRec?'fill':'regular'} color={hacerRec?activeColor:'var(--text-muted)'}/>
                    Hacer recurrente
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                    {hacerRec?'Se guardará como gasto automático periódico':'Activá para repetición automática'}
                  </div>
                </div>
              </label>
              {hacerRec && (
                <div style={{ padding:'16px 18px', borderTop:`1px solid ${activeColor}30`, background:'var(--surface)' }}>
                  <div style={{ marginBottom:14 }}>
                    <label style={lbl}>Frecuencia</label>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {FRECUENCIAS.map(({ val, label, Icon:Ic }) => (
                        <button key={val} onClick={()=>setRec('frecuencia',val)} aria-pressed={recForm.frecuencia===val}
                          style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${recForm.frecuencia===val?activeColor:'var(--border)'}`, background:recForm.frecuencia===val?`${activeColor}15`:'var(--surface)', color:recForm.frecuencia===val?activeColor:'var(--text-secondary)', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          <Ic size={13} weight={recForm.frecuencia===val?'fill':'regular'}/>{label}
                        </button>
                      ))}
                    </div>
                    {recForm.frecuencia==='custom' && (
                      <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>Cada</span>
                        <input type="number" min="1" max="365" value={recForm.intervalo_dias} onChange={e=>setRec('intervalo_dias',e.target.value)} style={{ ...inp, width:80 }} aria-label="Intervalo en días"/>
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>días</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div><label style={lbl}>Fecha inicio</label><input type="date" value={recForm.fecha_inicio} onChange={e=>setRec('fecha_inicio',e.target.value)} style={inp}/></div>
                    <div><label style={lbl}>Fecha fin (opcional)</label><input type="date" value={recForm.fecha_fin} onChange={e=>setRec('fecha_fin',e.target.value)} style={inp}/></div>
                  </div>
                  <div style={{ marginTop:10, display:'flex', alignItems:'flex-start', gap:6 }}>
                    <IconInfo size={14} color="var(--text-muted)" style={{ flexShrink:0, marginTop:1 }}/>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, fontStyle:'italic' }}>Podés editarlo o pausarlo desde Configuración → Gastos Recurrentes</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div style={{ marginTop:24, display:'flex', gap:10, justifyContent:'flex-end' }}>
            {initial && (
              <button onClick={onCancel} style={{ padding:'11px 24px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:14, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <IconCerrar size={15}/> Cancelar
              </button>
            )}
            <button onClick={handleSubmit} disabled={!valid||saving} aria-disabled={!valid||saving}
              style={{ padding:'11px 32px', borderRadius:10, border:'none', cursor:valid&&!saving?'pointer':'not-allowed', background:valid?`linear-gradient(135deg,${activeColor},${activeColor}bb)`:'var(--border)', color:valid?'#fff':'var(--text-muted)', fontSize:14, fontWeight:800, boxShadow:valid?`0 4px 14px ${activeColor}44`:'none', display:'flex', alignItems:'center', gap:8 }}>
              {saving
                ? <><IconRecurrentes size={15} style={{ animation:'spin 1s linear infinite' }}/> Guardando…</>
                : initial ? <><IconGuardar size={15}/> Guardar Cambios</>
                : hacerRec ? <><IconExito size={15}/> Registrar + Recurrencia</>
                : <><IconExito size={15}/> Registrar Gasto</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
