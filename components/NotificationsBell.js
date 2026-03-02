'use client'
import { useState, useEffect, useRef } from 'react'
import { IconCampana } from '../lib/icons'
import { ALERTA_STYLE } from '../lib/useAlertas'

export default function NotificationsBell({ alertas = [] }) {
  const [open, setOpen] = useState(false)
  const [vistas, setVistas] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('alertas_vistas') || '[]')) }
    catch { return new Set() }
  })
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset vistas cuando cambian las alertas (nuevo mes, nuevas alertas)
  useEffect(() => {
    const idsActuales = new Set(alertas.map(a => a.id))
    setVistas(prev => new Set([...prev].filter(id => idsActuales.has(id))))
  }, [alertas.map(a=>a.id).join(',')])

  const noVistas = alertas.filter(a => !vistas.has(a.id))
  const count    = noVistas.length
  const hayCritica = alertas.some(a => a.severidad === 'critica')

  const handleOpen = () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen && count > 0) {
      const nuevasVistas = new Set([...vistas, ...alertas.map(a => a.id)])
      setVistas(nuevasVistas)
      try { localStorage.setItem('alertas_vistas', JSON.stringify([...nuevasVistas])) } catch {}
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={handleOpen} style={NS.bell} title="Alertas del mes">
        <IconCampana size={18}
          weight={alertas.length > 0 ? 'fill' : 'regular'}
          color={alertas.length === 0 ? '#94a3b8' : hayCritica ? '#ef4444' : '#f59e0b'}/>
        {count > 0 && (
          <span style={{ ...NS.badge, background: hayCritica ? '#ef4444' : '#f59e0b' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={NS.dropdown}>
          <div style={NS.dropHeader}>
            <span style={{ fontWeight:800, fontSize:14, color:'var(--text-primary)' }}>
              Alertas del mes
            </span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              {alertas.length > 0 ? `${alertas.length} alerta${alertas.length !== 1 ? 's' : ''}` : 'Sin alertas'}
            </span>
          </div>

          <div style={{ maxHeight:420, overflowY:'auto' }}>
            {alertas.length === 0 ? (
              <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:13, fontWeight:600 }}>Todo en orden</div>
                <div style={{ fontSize:12, marginTop:4 }}>Sin alertas este mes</div>
              </div>
            ) : alertas.map(a => {
              const s = ALERTA_STYLE[a.severidad]
              return (
                <div key={a.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)',
                  borderLeft:`3px solid ${s.color}`, background: vistas.has(a.id) ? 'transparent' : `${s.bg}` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{s.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:s.color, marginBottom:2 }}>
                        {a.titulo}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.4 }}>
                        {a.detalle}
                      </div>
                      {a.pct !== undefined && (
                        <div style={{ marginTop:6, height:4, borderRadius:2, background:'var(--border)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(a.pct, 100)}%`,
                            background: s.color, borderRadius:2, transition:'width .5s' }}/>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)',
            fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
            Mes actual · Configurá presupuestos en Ajustes →
          </div>
        </div>
      )}
    </div>
  )
}

const NS = {
  bell:      { position:'relative', border:'none', background:'rgba(255,255,255,.08)',
               borderRadius:8, padding:'8px 10px', cursor:'pointer', display:'flex', alignItems:'center' },
  badge:     { position:'absolute', top:-4, right:-4, color:'#fff', borderRadius:'50%',
               width:18, height:18, fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' },
  dropdown:  { position:'absolute', right:0, top:'calc(100% + 10px)', width:340,
               background:'var(--surface)', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,.25)',
               border:'1px solid var(--border)', zIndex:999, overflow:'hidden' },
  dropHeader:{ display:'flex', justifyContent:'space-between', alignItems:'center',
               padding:'14px 16px', borderBottom:'1px solid var(--border)' },
}
