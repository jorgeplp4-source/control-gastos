'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'
import {
  IconBienvenida, IconEtiquetas, IconRecurrentes,
  IconDashboard, IconRapido, IconTip, IconConfig,
  IconExito, IconArrowRight, IconArrowLeft, IconCerrar, IconLanzar,
  IconCheck,
} from '../lib/icons'

const STORAGE_KEY = 'onboarding_done_v1'

// Pesos Phosphor según contexto: 'duotone' para íconos decorativos, 'fill' para activos
const PASOS = [
  {
    id: 'bienvenida',
    icon: IconBienvenida,
    titulo: '¡Bienvenido a Control de Gastos!',
    subtitulo: 'Tu asistente personal para registrar y entender tus gastos diarios.',
    color: '#3b82f6',
    contenido: ({ onNext }) => (
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:28, textAlign:'left' }}>
          {[
            { Icon:IconDashboard,  titulo:'Dashboard',    desc:'Visualizá tus gastos con gráficos claros',          color:'#3b82f6' },
            { Icon:IconEtiquetas,  titulo:'4 niveles',    desc:'Categorizá con precisión: Tipo › Área › Sub › Ítem', color:'#059669' },
            { Icon:IconRecurrentes,titulo:'Recurrentes',  desc:'Automatizá gastos fijos que se repiten',             color:'#d97706' },
            { Icon:IconRapido,     titulo:'Gasto rápido', desc:'Registrá desde la pantalla de inicio',               color:'#8b5cf6' },
          ].map(({ Icon:Ic, titulo, desc, color }) => (
            <div key={titulo} style={{ background:'var(--surface2)', borderRadius:12, padding:'14px 16px' }}>
              <Ic size={24} weight="duotone" color={color} style={{ marginBottom:6 }} aria-hidden="true" />
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', marginBottom:2 }}>{titulo}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
        <button onClick={onNext} style={btnPrimary('#3b82f6')}>
          Empezar <IconArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    ),
  },
  {
    id: 'categorias',
    icon: IconEtiquetas,
    titulo: 'Sistema de categorías jerárquico',
    subtitulo: 'Cada gasto se clasifica en 4 niveles para análisis detallados.',
    color: '#059669',
    contenido: ({ onNext, onPrev }) => (
      <div>
        <div style={{ marginBottom:20 }}>
          {[
            { nivel:'N1 · Tipo',         ejemplo:'Variables',          color:'#059669', desc:'La naturaleza del gasto'        },
            { nivel:'N2 · Área',         ejemplo:'Alimentación Básica',color:'#0891b2', desc:'El área de vida afectada'       },
            { nivel:'N3 · Subcategoría', ejemplo:'Proteínas Animales', color:'#7c3aed', desc:'Categoría específica'           },
            { nivel:'N4 · Ítem',         ejemplo:'Pollo',              color:'#db2777', desc:'El producto o servicio exacto'  },
          ].map(({ nivel, ejemplo, color, desc }, i) => (
            <div key={nivel} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{nivel}</span>
                  <span style={{ padding:'2px 10px', borderRadius:99, background:`${color}18`, color, fontSize:12, fontWeight:700 }}>{ejemplo}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:'3px 0 0' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:'#f0fdf4', borderRadius:10, padding:'12px 16px', marginBottom:20, border:'1px solid #bbf7d0', display:'flex', gap:8 }}>
          <IconCheck size={16} weight="bold" color="#166534" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true" />
          <p style={{ margin:0, fontSize:13, color:'#166534', fontWeight:500 }}>
            Ya tenés <strong>104 categorías del sistema</strong> precargadas. Podés agregar las tuyas desde Configuración → Categorías.
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onPrev} style={btnGhost}><IconArrowLeft size={14} aria-hidden="true" /> Atrás</button>
          <button onClick={onNext} style={btnPrimary('#059669')}>Entendido <IconArrowRight size={14} aria-hidden="true" /></button>
        </div>
      </div>
    ),
  },
  {
    id: 'recurrentes',
    icon: IconRecurrentes,
    titulo: 'Configurá gastos automáticos',
    subtitulo: 'Servicios, alquileres y suscripciones se pueden registrar solos.',
    color: '#d97706',
    contenido: ({ onNext, onPrev }) => (
      <div>
        <div style={{ background:'var(--surface2)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
          <p style={{ fontSize:14, color:'var(--text-secondary)', margin:'0 0 16px', lineHeight:1.6 }}>
            Al registrar cualquier gasto, podés activar el toggle <strong style={{ display:'inline-flex', alignItems:'center', gap:3 }}><IconRecurrentes size={14} aria-hidden="true" /> Hacer recurrente</strong> para que se registre automáticamente.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {['Electricidad y gas mensual','Netflix, Spotify, suscripciones','Alquiler o cuotas','Compras semanales habituales'].map(ej => (
              <div key={ej} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)' }}>
                <IconCheck size={14} weight="bold" color="#10b981" aria-hidden="true" /> {ej}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#fffbeb', borderRadius:10, padding:'12px 16px', marginBottom:20, border:'1px solid #fde68a', display:'flex', gap:8 }}>
          <IconConfig size={16} weight="duotone" color="#92400e" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true" />
          <p style={{ margin:0, fontSize:13, color:'#92400e', fontWeight:500 }}>
            Administrá todos tus recurrentes desde <strong>Configuración → Gastos Recurrentes</strong>.
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onPrev} style={btnGhost}><IconArrowLeft size={14} aria-hidden="true" /> Atrás</button>
          <button onClick={onNext} style={btnPrimary('#d97706')}>
            ¡Listo, empezar! <IconLanzar size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    ),
  },
]

const btnPrimary = (color) => ({
  padding:'12px 28px', borderRadius:12, border:'none',
  background:`linear-gradient(135deg,${color},${color}cc)`, color:'#fff',
  fontWeight:800, fontSize:14, cursor:'pointer',
  boxShadow:`0 4px 14px ${color}44`, flex:1,
  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
})
const btnGhost = {
  padding:'12px 20px', borderRadius:12, border:'1.5px solid var(--border)',
  background:'var(--surface)', color:'var(--text-secondary)', fontWeight:600,
  fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
}

export default function Onboarding({ onComplete }) {
  const [paso, setPaso]       = useState(0)
  const [visible, setVisible] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      if (localStorage.getItem(STORAGE_KEY)) return
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) return
      const diffMin = (Date.now() - new Date(user.created_at).getTime()) / 60000
      if (diffMin < 10) setVisible(true)
    }
    check()
  }, [])

  const handleComplete = () => { localStorage.setItem(STORAGE_KEY,'1'); setVisible(false); onComplete?.() }
  const handleSkip     = () => { localStorage.setItem(STORAGE_KEY,'1'); setVisible(false) }

  if (!visible) return null

  const pasoActual = PASOS[paso]
  const PasoIcon   = pasoActual.icon
  const Contenido  = pasoActual.contenido

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div style={{ background:'var(--surface)', borderRadius:24, width:'100%', maxWidth:520, boxShadow:'0 24px 64px rgba(0,0,0,.3)', overflow:'hidden' }}>

        {/* Barra de progreso */}
        <div style={{ height:4, background:'var(--border)' }}>
          <div style={{ height:'100%', width:`${((paso+1)/PASOS.length)*100}%`, background:pasoActual.color, transition:'width .3s ease' }} />
        </div>

        <div style={{ padding:'28px 32px' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ width:52, height:52, borderRadius:16, background:`${pasoActual.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <PasoIcon size={28} weight="duotone" color={pasoActual.color} aria-hidden="true" />
              </div>
              <div>
                <h2 id="onboarding-title" style={{ margin:0, fontSize:17, fontWeight:800, color:'var(--text-primary)', lineHeight:1.3 }}>{pasoActual.titulo}</h2>
                <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-muted)', lineHeight:1.4 }}>{pasoActual.subtitulo}</p>
              </div>
            </div>
            <button onClick={handleSkip} aria-label="Cerrar onboarding"
              style={{ border:'none', background:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, display:'flex', flexShrink:0 }}>
              <IconCerrar size={18} aria-hidden="true" />
            </button>
          </div>

          <Contenido
            onNext={paso < PASOS.length-1 ? () => setPaso(p=>p+1) : handleComplete}
            onPrev={() => setPaso(p=>p-1)}
          />

          {/* Dots */}
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:20 }}>
            {PASOS.map((_,i) => (
              <div key={i} style={{ width:i===paso?20:6, height:6, borderRadius:99, background:i===paso?pasoActual.color:'var(--border)', transition:'all .2s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
