'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { fmt } from '../lib/constants'
import { useApp } from '../context/AppContext'
import { useIngresos } from '../lib/useIngresos'
import {
  analizarTopItems, analizarComprasMayor, generarSugerencias,
  proyectarCierre, responderPregunta, PREGUNTAS_CHAT,
} from '../lib/asesorEngine'

const money = (v, fmtMoney) => fmtMoney ? fmtMoney(v) : `$${fmt(v)}`

// ── Barra de progreso ─────────────────────────────────────────────────────────
function BarraProgreso({ pct, color }) {
  return (
    <div style={{ height:6, borderRadius:3, background:'var(--border)', overflow:'hidden', marginTop:6 }}>
      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:color,
        borderRadius:3, transition:'width .5s ease' }}/>
    </div>
  )
}

// ── Tarjeta de sección ────────────────────────────────────────────────────────
function Card({ title, emoji, children, color='var(--accent)' }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16,
      overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)',
        borderLeft:`4px solid ${color}`, display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:20 }}>{emoji}</span>
        <h3 style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{title}</h3>
      </div>
      <div style={{ padding:'18px 20px' }}>{children}</div>
    </div>
  )
}

// ── Panel top ítems ───────────────────────────────────────────────────────────
function TopItems({ gastos, fmtMoney }) {
  const items = useMemo(() => analizarTopItems(gastos), [gastos])
  if (!items.length) return <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>Sin gastos este mes.</p>
  const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {items.map((item, i) => (
        <div key={item.nombre}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, fontWeight:800, color:COLORS[i%COLORS.length],
                background:`${COLORS[i%COLORS.length]}18`, borderRadius:99, padding:'2px 7px' }}>#{i+1}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{item.nombre}</span>
              {item.n1 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{item.n1}</span>}
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:14, fontWeight:800, color:COLORS[i%COLORS.length] }}>
                {money(item.monto, fmtMoney)}
              </span>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:5 }}>{item.pct}%</span>
            </div>
          </div>
          <BarraProgreso pct={item.pct} color={COLORS[i%COLORS.length]}/>
        </div>
      ))}
    </div>
  )
}

// ── Panel compras por mayor ───────────────────────────────────────────────────
function ComprasMayor({ gastos, fmtMoney }) {
  const sugerencias = useMemo(() => analizarComprasMayor(gastos), [gastos])
  if (!sugerencias.length) return (
    <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>
      Necesitás al menos 3 compras del mismo ítem en 2 meses distintos para ver sugerencias de compra por mayor.
    </p>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {sugerencias.map(s => (
        <div key={s.nombre} style={{ background:'var(--surface2)', borderRadius:12, padding:'14px 16px',
          border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>
                {s.nombre}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                Lo comprás {s.frecuenciaMes}x/mes · presente en {s.mesesPresente} meses
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Ahorro estimado</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#22c55e' }}>
                {money(s.ahorroEstimado, fmtMoney)}
              </div>
            </div>
          </div>
          <div style={{ marginTop:10, padding:'10px 12px', background:'#f0fdf4',
            border:'1px solid #bbf7d0', borderRadius:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#166534' }}>💡 Sugerencia</div>
            <div style={{ fontSize:12, color:'#15803d', marginTop:3 }}>
              Comprá {s.cantidadSugerida} {s.unidad} para 3 meses
              {s.precioUnitProm ? ` (precio unitario aprox. ${money(s.precioUnitProm, fmtMoney)})` : ''}.
              Estimamos un ahorro del 18% comprando en cantidad: <strong>{money(s.ahorroEstimado, fmtMoney)}</strong>.
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Panel sugerencias ─────────────────────────────────────────────────────────
function Sugerencias({ gastos, ingresos, fmtMoney }) {
  const ingresosMes = useMemo(() => {
    const mes = new Date().toISOString().slice(0,7)
    return ingresos.filter(i=>i.fecha.startsWith(mes)).reduce((s,i)=>s+(i.monto||0),0)
  }, [ingresos])
  const sugs = useMemo(() => generarSugerencias(gastos, ingresosMes), [gastos, ingresosMes])
  const { proyeccion, promDia, diasRestantes } = useMemo(() => proyectarCierre(gastos), [gastos])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Proyección */}
      <div style={{ background:'var(--surface2)', borderRadius:12, padding:'14px 16px',
        border:'1px solid var(--border)', display:'flex', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>
            Proyección al cierre
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'#6366f1' }}>
            {money(proyeccion, fmtMoney)}
          </div>
        </div>
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>
            Ritmo diario
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>
            {money(promDia, fmtMoney)}
          </div>
        </div>
        <div style={{ flex:1, minWidth:80 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>
            Días restantes
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>{diasRestantes}</div>
        </div>
      </div>

      {/* Sugerencias */}
      {!sugs.length ? (
        <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>
          Necesitás al menos 2 meses de datos para generar sugerencias personalizadas.
        </p>
      ) : sugs.map(s => (
        <div key={s.tipo} style={{ borderRadius:12, padding:'14px 16px',
          background:'var(--surface2)', border:'1px solid var(--border)',
          borderLeft:`3px solid ${s.ahorro>0?'#f59e0b':'#22c55e'}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{s.icono}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>{s.titulo}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6 }}>{s.detalle}</div>
              <div style={{ fontSize:12, color:'#6366f1', fontWeight:600 }}>→ {s.accion}</div>
              {s.ahorro > 0 && (
                <div style={{ marginTop:6, fontSize:11, color:'#22c55e', fontWeight:700 }}>
                  Ahorro potencial: {money(s.ahorro, fmtMoney)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function Chat({ gastos, ingresos }) {
  const [mensajes, setMensajes] = useState([
    { rol:'asesor', texto:'¡Hola! Soy tu asesor financiero. Seleccioná una pregunta o escribí la tuya.' }
  ])
  const [escribiendo, setEscribiendo] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [mensajes])

  const responder = (preguntaId, labelTexto) => {
    const textoUsuario = labelTexto
    setMensajes(prev => [...prev, { rol:'usuario', texto:textoUsuario }])
    setEscribiendo(true)
    setTimeout(() => {
      const respuesta = responderPregunta(preguntaId, gastos, ingresos)
      setMensajes(prev => [...prev, { rol:'asesor', texto:respuesta }])
      setEscribiendo(false)
    }, 500)
  }

  const bubble = (rol) => ({
    maxWidth:'85%', padding:'10px 14px', borderRadius:14, fontSize:13, lineHeight:1.55,
    whiteSpace:'pre-line',
    ...(rol==='usuario'
      ? { background:'var(--accent)', color:'#fff', borderBottomRightRadius:4, alignSelf:'flex-end' }
      : { background:'var(--surface2)', color:'var(--text-primary)', border:'1px solid var(--border)', borderBottomLeftRadius:4, alignSelf:'flex-start' }
    )
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Mensajes */}
      <div style={{ minHeight:180, maxHeight:340, overflowY:'auto', display:'flex',
        flexDirection:'column', gap:10, padding:'4px 0 12px' }}>
        {mensajes.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.rol==='usuario'?'flex-end':'flex-start' }}>
            <div style={bubble(m.rol)}>{m.texto}</div>
          </div>
        ))}
        {escribiendo && (
          <div style={{ display:'flex', justifyContent:'flex-start' }}>
            <div style={{ ...bubble('asesor'), color:'var(--text-muted)' }}>Analizando tu data…</div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Preguntas rápidas */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8,
          textTransform:'uppercase', letterSpacing:'.05em' }}>Preguntas rápidas</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {PREGUNTAS_CHAT.map(p => (
            <button key={p.id} onClick={() => responder(p.id, p.label)}
              disabled={escribiendo}
              style={{ padding:'7px 13px', borderRadius:99, border:'1.5px solid var(--border)',
                background:'var(--surface2)', color:'var(--text-secondary)', fontSize:12,
                fontWeight:600, cursor:escribiendo?'not-allowed':'pointer', transition:'all .15s',
                display:'flex', alignItems:'center', gap:5 }}
              onMouseEnter={e=>{ if(!escribiendo){ e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)' }}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AsesorPage({ gastos = [] }) {
  const { fmtMoney } = useApp()
  const { ingresos } = useIngresos()
  const [seccion, setSeccion] = useState('sugerencias')

  const TABS = [
    { id:'sugerencias', label:'Sugerencias',    emoji:'💡' },
    { id:'top',         label:'Top gastos',     emoji:'🏆' },
    { id:'mayor',       label:'Compra por mayor',emoji:'🛒' },
    { id:'chat',        label:'Preguntar',       emoji:'💬' },
  ]

  if (!gastos.length) return (
    <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🤖</div>
      <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>
        Asesor Virtual
      </h2>
      <p style={{ color:'var(--text-muted)', fontSize:14 }}>
        Registrá algunos gastos para que el asesor pueda analizar tus patrones y darte sugerencias personalizadas.
      </p>
    </div>
  )

  return (
    <div style={{ maxWidth:780, margin:'0 auto', paddingBottom:40 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:'var(--text-primary)',
          display:'flex', alignItems:'center', gap:8 }}>
          🤖 Asesor Virtual
        </h2>
        <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>
          Análisis automático de tus finanzas · {gastos.length} gastos registrados
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSeccion(t.id)}
            style={{ padding:'8px 16px', borderRadius:99, border:'none', cursor:'pointer',
              fontSize:13, fontWeight:700, transition:'all .15s',
              background: seccion===t.id ? 'var(--accent)' : 'var(--surface2)',
              color:       seccion===t.id ? '#fff'          : 'var(--text-secondary)',
              boxShadow:   seccion===t.id ? '0 2px 8px rgba(99,102,241,.35)' : 'none',
              display:'flex', alignItems:'center', gap:5 }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {seccion === 'sugerencias' && (
        <Card title="Sugerencias de ahorro" emoji="💡" color="#f59e0b">
          <Sugerencias gastos={gastos} ingresos={ingresos} fmtMoney={fmtMoney}/>
        </Card>
      )}
      {seccion === 'top' && (
        <Card title="Top ítems que más gastan este mes" emoji="🏆" color="#6366f1">
          <TopItems gastos={gastos} fmtMoney={fmtMoney}/>
        </Card>
      )}
      {seccion === 'mayor' && (
        <Card title="Oportunidades de compra por mayor" emoji="🛒" color="#22c55e">
          <ComprasMayor gastos={gastos} fmtMoney={fmtMoney}/>
        </Card>
      )}
      {seccion === 'chat' && (
        <Card title="Preguntale al asesor" emoji="💬" color="#3b82f6">
          <Chat gastos={gastos} ingresos={ingresos}/>
        </Card>
      )}
    </div>
  )
}
