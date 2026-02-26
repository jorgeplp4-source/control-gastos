'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'
import { useApp } from '../context/AppContext'
import CatalogManager from './CatalogManager'
import RecurrentesPage from './RecurrentesPage'
import UnitsManager from './UnitsManager'
import {
  IconTema, IconGlobo, IconIdioma, IconEtiquetas, IconRecurrentes, IconItems,
  IconClaro, IconOscuro, IconSistema, IconExito, IconGuardar, IconConfig,
} from '../lib/icons'

const CURRENCIES = [
  { code:'ARS', symbol:'$',  name:'Peso argentino'   },
  { code:'USD', symbol:'US$',name:'Dólar'             },
  { code:'EUR', symbol:'€',  name:'Euro'              },
  { code:'BRL', symbol:'R$', name:'Real brasileño'    },
  { code:'CLP', symbol:'$',  name:'Peso chileno'      },
  { code:'MXN', symbol:'$',  name:'Peso mexicano'     },
  { code:'COP', symbol:'$',  name:'Peso colombiano'   },
  { code:'UYU', symbol:'$',  name:'Peso uruguayo'     },
  { code:'PYG', symbol:'₲',  name:'Guaraní paraguayo' },
]

const DATE_FORMATS = [
  { value:'DD/MM/YYYY', label:'DD/MM/AAAA  (31/12/2025)' },
  { value:'MM/DD/YYYY', label:'MM/DD/AAAA  (12/31/2025)' },
  { value:'YYYY-MM-DD', label:'AAAA-MM-DD  (2025-12-31)' },
]

const THEMES = [
  { val:'light', label:'Claro',   Icon:IconClaro   },
  { val:'dark',  label:'Oscuro',  Icon:IconOscuro  },
  { val:'system',label:'Sistema', Icon:IconSistema },
]

const SECCIONES = [
  { id:'apariencia', label:'Apariencia',    Icon:IconTema,       group:'Preferencias' },
  { id:'regional',   label:'Regional',      Icon:IconGlobo,      group:'Preferencias' },
  { id:'idioma',     label:'Idioma',        Icon:IconIdioma,     group:'Preferencias' },
  { id:'catalogo',   label:'Catálogo',      Icon:IconEtiquetas,  group:'Datos' },
  { id:'unidades',   label:'Unidades',      Icon:IconItems,      group:'Datos' },
  { id:'recurrentes',label:'Recurrentes',   Icon:IconRecurrentes,group:'Datos' },
]

export default function ConfigPage() {
  const supabase = createClient()
  const { settings, saveSettings } = useApp()
  const [seccion,  setSeccion]  = useState('apariencia')
  const [local,    setLocal]    = useState({ theme:'system', currency:'ARS', language:'es', date_format:'DD/MM/YYYY' })
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (settings) setLocal({
      theme:       settings.theme       || 'system',
      currency:    settings.currency    || 'ARS',
      language:    settings.language    || 'es',
      date_format: settings.date_format || 'DD/MM/YYYY',
    })
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
    await saveSettings?.(local)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = { padding:'9px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface)', outline:'none', color:'var(--text-primary)', fontFamily:'inherit', width:'100%' }

  const showSave = !['catalogo','unidades','recurrentes'].includes(seccion)

  // Agrupar secciones
  const groups = {}
  SECCIONES.forEach(s => { if (!groups[s.group]) groups[s.group] = []; groups[s.group].push(s) })

  const renderSection = () => {
    switch(seccion) {
      case 'apariencia': return (
        <Section title="Apariencia" Icon={IconTema}>
          <label style={LBL}>Tema de la interfaz</label>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {THEMES.map(({ val, label, Icon:ThIcon }) => (
              <button key={val} onClick={() => setL('theme', val)} aria-pressed={local.theme===val}
                style={{ flex:1, minWidth:90, padding:'12px 10px', borderRadius:12, border:`2px solid ${local.theme===val?'var(--accent)':'var(--border)'}`, background:local.theme===val?'var(--accent-light)':'var(--surface2)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all .15s' }}>
                <ThIcon size={26} weight={local.theme===val?'fill':'regular'} color={local.theme===val?'var(--accent)':'var(--text-muted)'} aria-hidden="true" />
                <span style={{ fontSize:12, fontWeight:700, color:local.theme===val?'var(--accent)':'var(--text-secondary)' }}>{label}</span>
              </button>
            ))}
          </div>
        </Section>
      )

      case 'regional': return (
        <Section title="Regional" Icon={IconGlobo}>
          <div>
            <label style={LBL}>Moneda</label>
            <select value={local.currency} onChange={e=>setL('currency',e.target.value)} style={inp} aria-label="Moneda">
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Formato de fecha</label>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {DATE_FORMATS.map(df => (
                <label key={df.value} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:`2px solid ${local.date_format===df.value?'var(--accent)':'var(--border)'}`, background:local.date_format===df.value?'var(--accent-light)':'var(--surface2)', cursor:'pointer', transition:'all .12s' }}>
                  <input type="radio" name="date_format" value={df.value} checked={local.date_format===df.value} onChange={()=>setL('date_format',df.value)} style={{ accentColor:'var(--accent)' }} />
                  <span style={{ fontSize:13, fontWeight:local.date_format===df.value?700:500, color:local.date_format===df.value?'var(--accent)':'var(--text-primary)', fontFamily:'monospace' }}>{df.label}</span>
                </label>
              ))}
            </div>
          </div>
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

      case 'catalogo': return (
        <Section title="Catálogo" Icon={IconEtiquetas}
          subtitle="Jerarquía completa: Tipo → Área → Subcategoría → Ítem · Hover para ver acciones" noSave>
          <CatalogManager />
        </Section>
      )

      case 'unidades': return (
        <Section title="Unidades de medida" Icon={IconItems}
          subtitle="Administrá las unidades disponibles al registrar gastos" noSave>
          <UnitsManager />
        </Section>
      )

      case 'recurrentes': return (
        <Section title="Gastos Recurrentes" Icon={IconRecurrentes} noSave>
          <RecurrentesPage />
        </Section>
      )
    }
  }

  return (
    <div style={{ display:'flex', gap:0, minHeight:'60vh', background:'var(--surface)', borderRadius:20, boxShadow:'var(--shadow)', border:'1px solid var(--border)', overflow:'hidden' }}>

      {/* Sidebar desktop */}
      {!isMobile && (
        <nav style={{ width:210, background:'var(--surface2)', borderRight:'1px solid var(--border)', padding:'20px 0', flexShrink:0 }} aria-label="Configuración">
          <div style={{ padding:'0 16px 12px', fontSize:10, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', display:'flex', alignItems:'center', gap:5 }}>
            <IconConfig size={11} aria-hidden="true" />Configuración
          </div>
          {Object.entries(groups).map(([group, secs]) => (
            <div key={group} style={{ marginBottom:8 }}>
              <div style={{ padding:'4px 16px', fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{group}</div>
              {secs.map(({ id, label, Icon:SIcon }) => (
                <button key={id} onClick={() => setSeccion(id)} aria-current={seccion===id?'page':undefined}
                  style={{ width:'100%', padding:'9px 16px', border:'none', background:seccion===id?'var(--accent-light)':'transparent', color:seccion===id?'var(--accent)':'var(--text-secondary)', fontWeight:seccion===id?700:500, fontSize:13, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:9, borderRight:seccion===id?'3px solid var(--accent)':'3px solid transparent', transition:'all .1s' }}>
                  <SIcon size={15} weight={seccion===id?'fill':'regular'} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      )}

      {/* Mobile tabs */}
      {isMobile && (
        <nav style={{ display:'flex', overflowX:'auto', borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0, width:'100%' }} aria-label="Configuración">
          {SECCIONES.map(({ id, label, Icon:SIcon }) => (
            <button key={id} onClick={() => setSeccion(id)} aria-current={seccion===id?'page':undefined}
              style={{ padding:'10px 14px', border:'none', borderBottom:seccion===id?'2px solid var(--accent)':'2px solid transparent', background:'transparent', color:seccion===id?'var(--accent)':'var(--text-muted)', fontWeight:seccion===id?700:500, fontSize:11, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
              <SIcon size={13} weight={seccion===id?'fill':'regular'} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* Contenido */}
      <div style={{ flex:1, padding: isMobile ? '20px 16px' : '24px 28px', overflowY:'auto' }}>
        {renderSection()}

        {showSave && (
          <div style={{ marginTop:22, display:'flex', alignItems:'center', gap:12, paddingTop:18, borderTop:'1px solid var(--border)' }}>
            {saved && (
              <span style={{ color:'#10b981', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
                <IconExito size={15} weight="fill" aria-hidden="true" /> ¡Guardado!
              </span>
            )}
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'10px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,var(--accent),var(--accent-dark))', color:'#fff', fontSize:13, fontWeight:800, cursor:saving?'wait':'pointer', display:'flex', alignItems:'center', gap:7, boxShadow:'0 4px 14px rgba(59,130,246,.3)' }}>
              <IconGuardar size={14} aria-hidden="true" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const LBL = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }

function Section({ title, Icon:SIcon, subtitle, children }) {
  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h3 style={{ margin:'0 0 3px', fontSize:16, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
          <SIcon size={18} weight="duotone" color="var(--accent)" aria-hidden="true" />
          {title}
        </h3>
        {subtitle && <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {children}
      </div>
    </div>
  )
}
