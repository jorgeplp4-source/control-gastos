'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'
import { useApp } from '../context/AppContext'
import CategoryEditor from './CategoryEditor'
import RecurrentesPage from './RecurrentesPage'
import {
  IconTema, IconGlobo, IconIdioma, IconEtiquetas, IconRecurrentes,
  IconClaro, IconOscuro, IconSistema, IconExito, IconGuardar, IconConfig,
} from '../lib/icons'

const CURRENCIES = [
  { code:'ARS', symbol:'$',  name:'Peso argentino'   },
  { code:'USD', symbol:'$',  name:'Dólar'             },
  { code:'EUR', symbol:'€',  name:'Euro'              },
  { code:'BRL', symbol:'R$', name:'Real brasileño'    },
  { code:'CLP', symbol:'$',  name:'Peso chileno'      },
  { code:'MXN', symbol:'$',  name:'Peso mexicano'     },
  { code:'COP', symbol:'$',  name:'Peso colombiano'   },
  { code:'UYU', symbol:'$',  name:'Peso uruguayo'     },
  { code:'PYG', symbol:'₲',  name:'Guaraní paraguayo' },
]

// Secciones del sidebar
const SECCIONES = [
  { id:'apariencia',  label:'Apariencia',         Icon: IconTema       },
  { id:'region',      label:'Regional',            Icon: IconGlobo      },
  { id:'idioma',      label:'Idioma',              Icon: IconIdioma     },
  { id:'categorias',  label:'Categorías',          Icon: IconEtiquetas  },
  { id:'recurrentes', label:'Gastos Recurrentes',  Icon: IconRecurrentes},
]

// Temas
const THEMES = [
  { val:'light', label:'Claro',   Icon: IconClaro   },
  { val:'dark',  label:'Oscuro',  Icon: IconOscuro  },
  { val:'system',label:'Sistema', Icon: IconSistema },
]

export default function ConfigPage() {
  const supabase = createClient()
  const { settings, updateSettings, t } = useApp()
  const [seccion, setSeccion] = useState('apariencia')
  const [local, setLocal]     = useState({ theme:'system', currency:'ARS', language:'es' })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (settings) setLocal({ theme:settings.theme||'system', currency:settings.currency||'ARS', language:settings.language||'es' })
  }, [settings])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const setL = (k, v) => setLocal(p => ({ ...p, [k]:v }))

  const handleSave = async () => {
    setSaving(true)
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const row = { user_id:user.id, theme:local.theme, currency:local.currency, language:local.language }
    await supabase.from('user_settings').upsert(row, { onConflict:'user_id' })
    updateSettings?.(local)
    if (local.theme !== 'system') {
      document.documentElement.setAttribute('data-theme', local.theme)
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme:dark)').matches
      document.documentElement.setAttribute('data-theme', isDark?'dark':'light')
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = { padding:'9px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface)', outline:'none', color:'var(--text-primary)', fontFamily:'inherit', width:'100%' }

  const renderSection = () => {
    switch(seccion) {
      case 'apariencia': return (
        <Section title="Apariencia" Icon={IconTema}>
          <label style={LBL}>Tema de la interfaz</label>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {THEMES.map(({ val, label, Icon: ThIcon }) => (
              <button key={val} onClick={() => setL('theme', val)} aria-pressed={local.theme===val}
                style={{ flex:1, minWidth:100, padding:'14px 12px', borderRadius:12, border:`2px solid ${local.theme===val?'var(--accent)':'var(--border)'}`, background:local.theme===val?'var(--accent-light)':'var(--surface2)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .15s' }}>
                <ThIcon size={28} weight={local.theme===val?'fill':'regular'} color={local.theme===val?'var(--accent)':'var(--text-muted)'} aria-hidden="true" />
                <span style={{ fontSize:13, fontWeight:700, color:local.theme===val?'var(--accent)':'var(--text-secondary)' }}>{label}</span>
              </button>
            ))}
          </div>
        </Section>
      )
      case 'region': return (
        <Section title="Regional" Icon={IconGlobo}>
          <label style={LBL}>Moneda</label>
          <select value={local.currency} onChange={e=>setL('currency',e.target.value)} style={inp} aria-label="Seleccionar moneda">
            {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>)}
          </select>
        </Section>
      )
      case 'idioma': return (
        <Section title="Idioma" Icon={IconIdioma}>
          <label style={LBL}>Idioma de la interfaz</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{ val:'es', label:'Español', flag:'🇦🇷' }, { val:'en', label:'English', flag:'🇺🇸' }].map(opt => (
              <button key={opt.val} onClick={() => setL('language', opt.val)} aria-pressed={local.language===opt.val}
                style={{ flex:1, padding:'12px', borderRadius:10, border:`2px solid ${local.language===opt.val?'var(--accent)':'var(--border)'}`, background:local.language===opt.val?'var(--accent-light)':'var(--surface2)', cursor:'pointer', fontWeight:700, fontSize:14, color:local.language===opt.val?'var(--accent)':'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>{opt.flag}</span>{opt.label}
              </button>
            ))}
          </div>
        </Section>
      )
      case 'categorias': return (
        <Section title="Categorías" Icon={IconEtiquetas} subtitle="Jerarquía de 4 niveles · Las del sistema no se pueden eliminar">
          <CategoryEditor />
        </Section>
      )
      case 'recurrentes': return (
        <Section title="Gastos Recurrentes" Icon={IconRecurrentes} noSave>
          <RecurrentesPage />
        </Section>
      )
    }
  }

  const showSave = seccion !== 'categorias' && seccion !== 'recurrentes'

  return (
    <div style={{ display:'flex', gap:0, minHeight:'60vh', background:'var(--surface)', borderRadius:20, boxShadow:'var(--shadow)', border:'1px solid var(--border)', overflow:'hidden' }}>

      {/* Sidebar desktop */}
      {!isMobile && (
        <nav style={{ width:220, background:'var(--surface2)', borderRight:'1px solid var(--border)', padding:'24px 0', flexShrink:0 }} aria-label="Secciones de configuración">
          <h2 style={{ margin:'0 0 16px', padding:'0 20px', fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            <IconConfig size={12} style={{ marginRight:4 }} aria-hidden="true" />Configuración
          </h2>
          {SECCIONES.map(({ id, label, Icon: SIcon }) => (
            <button key={id} onClick={() => setSeccion(id)} aria-current={seccion===id?'page':undefined}
              style={{ width:'100%', padding:'10px 20px', border:'none', background:seccion===id?'var(--accent-light)':'transparent', color:seccion===id?'var(--accent)':'var(--text-secondary)', fontWeight:seccion===id?700:500, fontSize:14, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, borderRight:seccion===id?'3px solid var(--accent)':'3px solid transparent', transition:'all .15s' }}>
              <SIcon size={17} weight={seccion===id?'fill':'regular'} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* Mobile: tabs horizontales */}
      {isMobile && (
        <nav style={{ display:'flex', overflowX:'auto', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }} aria-label="Secciones de configuración">
          {SECCIONES.map(({ id, label, Icon: SIcon }) => (
            <button key={id} onClick={() => setSeccion(id)} aria-current={seccion===id?'page':undefined}
              style={{ padding:'12px 16px', border:'none', borderBottom:seccion===id?'2px solid var(--accent)':'2px solid transparent', background:'transparent', color:seccion===id?'var(--accent)':'var(--text-muted)', fontWeight:seccion===id?700:500, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
              <SIcon size={15} weight={seccion===id?'fill':'regular'} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* Contenido */}
      <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
        <div style={{ display:isMobile?'block':'none' }}>{/* spacer mobile */}</div>
        {renderSection()}

        {showSave && (
          <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:12, paddingTop:20, borderTop:'1px solid var(--border)' }}>
            {saved && (
              <span style={{ color:'#10b981', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:5 }}>
                <IconExito size={16} weight="fill" aria-hidden="true" /> ¡Guardado!
              </span>
            )}
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'11px 28px', borderRadius:10, border:'none', background:'linear-gradient(135deg,var(--accent),var(--accent-dark))', color:'#fff', fontSize:14, fontWeight:800, cursor:saving?'wait':'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 14px rgba(59,130,246,.3)' }}>
              <IconGuardar size={15} aria-hidden="true" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const LBL = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }

function Section({ title, Icon: SIcon, subtitle, children }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ margin:'0 0 4px', fontSize:17, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
          <SIcon size={19} weight="duotone" color="var(--accent)" aria-hidden="true" />
          {title}
        </h3>
        {subtitle && <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {children}
      </div>
    </div>
  )
}
