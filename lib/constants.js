export const UNITS = ["unidad","kg","gr","litro","ml","paquete","caja","docena","metro","garrafa","bolsa","porción","rollo"]

export const N1_COLORS = {
  "Fijos":           { bg: "#1e40af", light: "#dbeafe", text: "#1e40af" },
  "Variables":       { bg: "#059669", light: "#d1fae5", text: "#059669" },
  "Extraordinarios": { bg: "#d97706", light: "#fef3c7", text: "#d97706" },
  "Imprevistos":     { bg: "#dc2626", light: "#fee2e2", text: "#dc2626" },
}

export const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16","#a78bfa"]

export const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0)

export const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "-"

export function uniq(arr) { return [...new Set(arr)] }

// ── Períodos reutilizables (Dashboard + ListView) ─────────────────────────────
export const PERIODOS = [
  { id:'hoy',     label:'Hoy'          },
  { id:'semana',  label:'Esta semana'  },
  { id:'7dias',   label:'Últ. 7 días'  },
  { id:'mes',     label:'Este mes'     },
  { id:'mes_ant', label:'Mes anterior' },
  { id:'anio',    label:'Este año'     },
  { id:'custom',  label:'Personalizado'},
]

export function getPeriodo(id) {
  const hoy = new Date()
  const pad  = n => String(n).padStart(2,'0')
  const iso  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  switch(id){
    case 'hoy':     { const s=iso(hoy); return {from:s,to:s} }
    case 'semana':  { const l=new Date(hoy); l.setDate(hoy.getDate()-((hoy.getDay()+6)%7)); return {from:iso(l),to:iso(hoy)} }
    case '7dias':   { const d=new Date(hoy); d.setDate(d.getDate()-6); return {from:iso(d),to:iso(hoy)} }
    case 'mes':     { return {from:`${hoy.getFullYear()}-${pad(hoy.getMonth()+1)}-01`,to:iso(hoy)} }
    case 'mes_ant': { const m=hoy.getMonth()===0?12:hoy.getMonth(); const y=hoy.getMonth()===0?hoy.getFullYear()-1:hoy.getFullYear(); const u=new Date(hoy.getFullYear(),hoy.getMonth(),0); return {from:`${y}-${pad(m)}-01`,to:iso(u)} }
    case 'anio':    { return {from:`${hoy.getFullYear()}-01-01`,to:iso(hoy)} }
    default: return {from:'',to:''}
  }
}

/** Dado un rango {from, to}, devuelve el rango del período inmediatamente anterior de igual duración */
export function getPeriodoAnterior({from, to}) {
  const f = new Date(from + 'T00:00:00')
  const t = new Date(to   + 'T00:00:00')
  const dias = Math.round((t - f) / 86400000) + 1
  const pad  = n => String(n).padStart(2,'0')
  const iso  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  const newTo  = new Date(f); newTo.setDate(newTo.getDate() - 1)
  const newFrom = new Date(newTo); newFrom.setDate(newFrom.getDate() - dias + 1)
  return { from: iso(newFrom), to: iso(newTo) }
}
