'use client'
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { createClient } from '../lib/supabase-browser'

const CURRENCIES = [
  { code:'ARS', symbol:'$',   name:'Peso argentino'   },
  { code:'USD', symbol:'US$', name:'Dólar'             },
  { code:'EUR', symbol:'€',   name:'Euro'              },
  { code:'BRL', symbol:'R$',  name:'Real brasileño'    },
  { code:'UYU', symbol:'$',   name:'Peso uruguayo'     },
  { code:'CLP', symbol:'$',   name:'Peso chileno'      },
  { code:'MXN', symbol:'$',   name:'Peso mexicano'     },
]

const DATE_FORMATS = [
  { value:'DD/MM/YYYY', label:'DD/MM/AAAA', ejemplo:'31/12/2025' },
  { value:'MM/DD/YYYY', label:'MM/DD/AAAA', ejemplo:'12/31/2025' },
  { value:'YYYY-MM-DD', label:'AAAA-MM-DD', ejemplo:'2025-12-31' },
]

const N1_OPTS = ['Variables','Fijos','Extraordinarios','Imprevistos']

const today = () => new Date().toISOString().split('T')[0]

// ── Indicador de pasos ────────────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:24 }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ width: i===current?24:8, height:8, borderRadius:99, transition:'all .3s',
          background: i<=current ? 'var(--accent)' : 'var(--border)' }}/>
      ))}
    </div>
  )
}

// ── Paso 1: Bienvenida ────────────────────────────────────────────────────────
function PasoBienvenida() {
  const features = [
    { emoji:'📝', titulo:'Registrá gastos', desc:'Por ítem, categoría o con tu voz' },
    { emoji:'📊', titulo:'Analizá tu data', desc:'Dashboard con gráficos y tendencias' },
    { emoji:'🤖', titulo:'Asesor Virtual',  desc:'Sugerencias de ahorro personalizadas' },
    { emoji:'🔔', titulo:'Alertas',         desc:'Avisamos cuando superás tus límites' },
  ]
  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:56, marginBottom:12 }}>👋</div>
        <h2 style={{ margin:'0 0 8px', fontSize:22, fontWeight:900, color:'var(--text-primary)' }}>
          ¡Bienvenido a tu control de gastos!
        </h2>
        <p style={{ margin:0, fontSize:14, color:'var(--text-muted)', lineHeight:1.6 }}>
          En 2 pasos rápidos dejás todo listo para empezar a registrar tus finanzas.
        </p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {features.map(f => (
          <div key={f.titulo} style={{ background:'var(--surface2)', borderRadius:12, padding:'14px 16px',
            border:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{f.emoji}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{f.titulo}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Paso 2: Configuración ─────────────────────────────────────────────────────
function PasoConfig({ config, setConfig }) {
  const set = (k,v) => setConfig(p => ({...p, [k]:v}))
  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10,
    fontSize:14, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit',
    outline:'none', width:'100%', boxSizing:'border-box', cursor:'pointer',
    appearance:'none',
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)',
    textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>⚙️</div>
        <h3 style={{ margin:'0 0 4px', fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>
          Configuración básica
        </h3>
        <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>
          Podés cambiar esto después en Ajustes.
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Moneda */}
        <div>
          <label style={lbl}>Moneda</label>
          <select value={config.currency} onChange={e=>set('currency',e.target.value)} style={inp}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {/* Formato de fecha */}
        <div>
          <label style={lbl}>Formato de fecha</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {DATE_FORMATS.map(df => (
              <label key={df.value} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                borderRadius:10, border:`2px solid ${config.date_format===df.value?'var(--accent)':'var(--border)'}`,
                background:config.date_format===df.value?'var(--accent-light)':'var(--surface2)',
                cursor:'pointer', transition:'all .12s' }}>
                <input type="radio" name="df_onb" value={df.value}
                  checked={config.date_format===df.value}
                  onChange={()=>set('date_format',df.value)}
                  style={{ accentColor:'var(--accent)', flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:config.date_format===df.value?700:500,
                  color:config.date_format===df.value?'var(--accent)':'var(--text-primary)' }}>
                  {df.label}
                </span>
                <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace', marginLeft:'auto' }}>
                  {df.ejemplo}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Paso 3: Primer gasto ──────────────────────────────────────────────────────
function PasoPrimerGasto({ gasto, setGasto }) {
  const set = (k,v) => setGasto(p=>({...p,[k]:v}))
  const inp = { padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10,
    fontSize:14, background:'var(--surface)', color:'var(--text-primary)', fontFamily:'inherit',
    outline:'none', width:'100%', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)',
    textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }
  const sel = { ...inp, cursor:'pointer', appearance:'none',
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' }

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>✏️</div>
        <h3 style={{ margin:'0 0 4px', fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>
          Registrá tu primer gasto
        </h3>
        <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>
          Opcional — podés saltear este paso si querés.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Descripción</label>
          <input value={gasto.n4} onChange={e=>set('n4',e.target.value)}
            placeholder="Ej: Café, Supermercado, Nafta…" style={inp}/>
        </div>
        <div>
          <label style={lbl}>Monto</label>
          <input type="number" min="0" step="1" value={gasto.monto}
            onChange={e=>set('monto',e.target.value)} placeholder="0" style={inp}/>
        </div>
        <div>
          <label style={lbl}>Fecha</label>
          <input type="date" value={gasto.fecha} onChange={e=>set('fecha',e.target.value)} style={inp}/>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Tipo de gasto</label>
          <select value={gasto.n1} onChange={e=>set('n1',e.target.value)} style={sel}>
            {N1_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────────────────────
export default function OnboardingModal({ onComplete }) {
  const { settings, saveSettings } = useApp()
  const supabase = createClient()
  const [paso,     setPaso]    = useState(0)
  const [saving,   setSaving]  = useState(false)
  const [config,   setConfig]  = useState({ currency:'ARS', date_format:'DD/MM/YYYY' })
  const [gasto,    setGasto]   = useState({ n4:'', monto:'', fecha:today(), n1:'Variables' })

  // Sync config with existing settings
  useEffect(() => {
    if (settings) setConfig({
      currency:    settings.currency    || 'ARS',
      date_format: settings.date_format || 'DD/MM/YYYY',
    })
  }, [settings])

  const TOTAL_PASOS = 3

  const handleNext = async () => {
    if (paso < TOTAL_PASOS - 1) { setPaso(p=>p+1); return }
    // Último paso: guardar todo
    setSaving(true)
    try {
      // 1. Guardar configuración
      await saveSettings({ ...config, onboarding_completed: true })

      // 2. Guardar primer gasto si tiene datos
      if (gasto.n4.trim() && parseFloat(gasto.monto) > 0) {
        await fetch('/api/gastos', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({
            n1:     gasto.n1,
            n2:     gasto.n1,
            n3:     gasto.n1,
            n4:     gasto.n4.trim(),
            monto:  parseFloat(gasto.monto),
            fecha:  gasto.fecha,
            cantidad: 1,
            unidad: 'unidad',
          }),
        })
      }

      onComplete?.()
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    await saveSettings({ ...config, onboarding_completed: true })
    setSaving(false)
    onComplete?.()
  }

  const btnPrimary = { padding:'11px 28px', borderRadius:10, border:'none', cursor:'pointer',
    background:'linear-gradient(135deg,var(--accent),#6366f1bb)', color:'#fff',
    fontSize:14, fontWeight:800, transition:'all .15s', boxShadow:'0 3px 12px rgba(99,102,241,.4)' }
  const btnSecondary = { padding:'11px 20px', borderRadius:10, border:'1.5px solid var(--border)',
    background:'var(--surface2)', color:'var(--text-secondary)', fontSize:14, fontWeight:600,
    cursor:'pointer', transition:'all .15s' }

  return (
    // Overlay
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>

      {/* Modal */}
      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:480,
        boxShadow:'0 24px 64px rgba(0,0,0,.35)', border:'1px solid var(--border)',
        overflow:'hidden', animation:'slideUp .3s ease' }}>

        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>

        {/* Barra de progreso superior */}
        <div style={{ height:4, background:'var(--border)' }}>
          <div style={{ height:'100%', width:`${((paso+1)/TOTAL_PASOS)*100}%`,
            background:'linear-gradient(90deg,var(--accent),#6366f1)', transition:'width .4s ease' }}/>
        </div>

        {/* Contenido */}
        <div style={{ padding:'28px 28px 20px' }}>
          {paso === 0 && <PasoBienvenida />}
          {paso === 1 && <PasoConfig config={config} setConfig={setConfig} />}
          {paso === 2 && <PasoPrimerGasto gasto={gasto} setGasto={setGasto} />}

          <StepDots total={TOTAL_PASOS} current={paso} />
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 28px 24px', display:'flex',
          justifyContent: paso===0 ? 'center' : 'space-between', alignItems:'center', gap:10 }}>
          {paso > 0 && (
            <button onClick={() => setPaso(p=>p-1)} style={btnSecondary}>
              ← Atrás
            </button>
          )}
          <div style={{ display:'flex', gap:10, marginLeft:'auto' }}>
            {paso === TOTAL_PASOS-1 && (
              <button onClick={handleSkip} disabled={saving} style={btnSecondary}>
                Saltear
              </button>
            )}
            <button onClick={handleNext} disabled={saving} style={btnPrimary}>
              {saving ? 'Guardando…' : paso === TOTAL_PASOS-1 ? '¡Listo! →' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
