/**
 * Motor del Asesor Virtual — lógica determinista pura.
 */

const fmt = (n) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n || 0)

function getMesActual() { return new Date().toISOString().slice(0, 7) }
function getMesAnterior() {
  const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7)
}
function gastosPorMes(gastos) {
  const meses = {}
  gastos.forEach(g => { const mes = g.fecha.slice(0,7); if (!meses[mes]) meses[mes]=[]; meses[mes].push(g) })
  return meses
}

// ── 1. TOP ÍTEMS ──────────────────────────────────────────────────────────────
export function analizarTopItems(gastos, mesActual) {
  const mes = mesActual || getMesActual()
  const gastosMes = gastos.filter(g => g.fecha.startsWith(mes))
  const total = gastosMes.reduce((s,g) => s+(g.monto||0), 0)
  if (total === 0) return []
  const porItem = {}
  gastosMes.forEach(g => {
    const key = g.n4 || g.n3 || g.n2 || g.n1 || 'Sin categoría'
    if (!porItem[key]) porItem[key] = { nombre:key, monto:0, veces:0, n1:g.n1 }
    porItem[key].monto += g.monto||0
    porItem[key].veces++
  })
  return Object.values(porItem)
    .sort((a,b) => b.monto-a.monto).slice(0,8)
    .map(x => ({ ...x, pct: Math.round(x.monto/total*100), totalMes: total }))
}

// ── 2. COMPRAS POR MAYOR ──────────────────────────────────────────────────────
export function analizarComprasMayor(gastos, mesesAnalizar=3) {
  const hoy = new Date()
  const desde = new Date(hoy); desde.setMonth(hoy.getMonth()-mesesAnalizar)
  const desdeStr = desde.toISOString().slice(0,10)
  const recientes = gastos.filter(g => g.fecha >= desdeStr && g.n4)
  const porItem = {}
  recientes.forEach(g => {
    const key = g.n4
    if (!porItem[key]) porItem[key] = { nombre:key, monto:0, cantidad:0, veces:0, unidad:g.unidad||'unidad', meses:new Set(), precioUnit:[] }
    porItem[key].monto += g.monto||0
    porItem[key].cantidad += parseFloat(g.cantidad)||1
    porItem[key].veces++
    porItem[key].meses.add(g.fecha.slice(0,7))
    if (g.monto && g.cantidad) porItem[key].precioUnit.push(g.monto/(parseFloat(g.cantidad)||1))
  })
  const sugerencias = []
  Object.values(porItem).forEach(item => {
    if (item.meses.size < 2 || item.veces < 3) return
    const gastoMensualProm = item.monto / mesesAnalizar
    const ahorroEstimado   = gastoMensualProm * mesesAnalizar * 0.18
    const cantidadSugerida = Math.ceil((item.cantidad/mesesAnalizar)*3)
    const precioUnitProm   = item.precioUnit.length > 0
      ? item.precioUnit.reduce((s,v)=>s+v,0)/item.precioUnit.length : null
    sugerencias.push({
      nombre: item.nombre, unidad: item.unidad,
      frecuenciaMes: +(item.veces/mesesAnalizar).toFixed(1),
      gastoMensualProm, gastoTrimestral: gastoMensualProm*3,
      ahorroEstimado, cantidadSugerida, precioUnitProm,
      mesesPresente: item.meses.size, vecesTotales: item.veces,
    })
  })
  return sugerencias.sort((a,b)=>b.ahorroEstimado-a.ahorroEstimado).slice(0,5)
}

// ── 3. SUGERENCIAS DE AHORRO ──────────────────────────────────────────────────
export function generarSugerencias(gastos, ingresosMes=0) {
  const mes    = getMesActual()
  const mesAnt = getMesAnterior()
  const gastosMes = gastos.filter(g => g.fecha.startsWith(mes))
  const gastosAnt = gastos.filter(g => g.fecha.startsWith(mesAnt))
  const porMes    = gastosPorMes(gastos)
  const mesesHist = Object.keys(porMes).filter(m => m < mes).sort().slice(-6)
  const totalMes  = gastosMes.reduce((s,g)=>s+(g.monto||0),0)
  const totalAnt  = gastosAnt.reduce((s,g)=>s+(g.monto||0),0)
  const sugerencias = []

  // Categoría que más creció
  const porN1Mes={}, porN1Ant={}
  gastosMes.forEach(g => { porN1Mes[g.n1]=(porN1Mes[g.n1]||0)+g.monto })
  gastosAnt.forEach(g => { porN1Ant[g.n1]=(porN1Ant[g.n1]||0)+g.monto })
  let maxCrec = null
  Object.entries(porN1Mes).forEach(([n1,val]) => {
    const ant = porN1Ant[n1]||0
    if (ant > 0) {
      const delta = (val-ant)/ant*100
      if (delta > 20 && (!maxCrec || delta > maxCrec.delta)) maxCrec = { n1, val, ant, delta }
    }
  })
  if (maxCrec) {
    const dif = maxCrec.val - maxCrec.ant
    sugerencias.push({
      tipo:'crecimiento', icono:'📈',
      titulo: `${maxCrec.n1} subió un ${Math.round(maxCrec.delta)}%`,
      detalle: `Gastaste $${fmt(maxCrec.val)} vs $${fmt(maxCrec.ant)} el mes pasado. Diferencia: $${fmt(dif)}.`,
      accion: `Revisá los gastos de ${maxCrec.n1} este mes para identificar el salto.`,
      ahorro: dif,
    })
  }

  // Gastos hormiga
  const HORMIGA_MAX = Math.max(1500, totalMes*0.008)
  const hormiga = gastosMes.filter(g => g.monto>0 && g.monto<=HORMIGA_MAX)
  const totalHormiga = hormiga.reduce((s,g)=>s+g.monto,0)
  if (hormiga.length >= 5 && totalHormiga > totalMes*0.08) {
    sugerencias.push({
      tipo:'hormiga', icono:'🐜',
      titulo: `${hormiga.length} gastos pequeños suman $${fmt(totalHormiga)}`,
      detalle: `Gastos de menos de $${fmt(HORMIGA_MAX)} que juntos son el ${Math.round(totalHormiga/totalMes*100)}% del total.`,
      accion: 'Revisá si podés eliminar o reducir algunos de estos gastos cotidianos.',
      ahorro: totalHormiga*0.3,
    })
  }

  // Sobre/bajo el promedio histórico
  if (mesesHist.length >= 3) {
    const promedioHist = mesesHist.map(m=>(porMes[m]||[]).reduce((s,g)=>s+g.monto,0))
      .reduce((s,v)=>s+v,0)/mesesHist.length
    if (totalMes > promedioHist*1.15) {
      const exceso = totalMes-promedioHist
      sugerencias.push({
        tipo:'sobre_promedio', icono:'📊',
        titulo: `Gastás un ${Math.round((totalMes/promedioHist-1)*100)}% más que tu promedio`,
        detalle: `Promedio mensual: $${fmt(promedioHist)}. Este mes: $${fmt(totalMes)} ($${fmt(exceso)} más).`,
        accion: 'Identificá si fue un gasto puntual o un cambio de hábito.',
        ahorro: exceso,
      })
    } else if (totalMes < promedioHist*0.9) {
      sugerencias.push({
        tipo:'bajo_promedio', icono:'✅',
        titulo: `Vas ${Math.round((1-totalMes/promedioHist)*100)}% por debajo de tu promedio`,
        detalle: `Promedio: $${fmt(promedioHist)} · Este mes: $${fmt(totalMes)}. ¡Buen trabajo!`,
        accion: 'Considerá destinar el excedente a ahorro o inversión.',
        ahorro: 0,
      })
    }
  }

  // % ingresos
  if (ingresosMes > 0 && totalMes > 0) {
    const pct = totalMes/ingresosMes*100
    if (pct > 90) {
      sugerencias.push({
        tipo:'ingresos_alto', icono:'⚡',
        titulo: `Usaste el ${Math.round(pct)}% de tus ingresos`,
        detalle: `Ingresos: $${fmt(ingresosMes)} · Gastos: $${fmt(totalMes)} · Quedan: $${fmt(ingresosMes-totalMes)}.`,
        accion: 'Intentá llegar al cierre del mes sin superar tus ingresos.',
        ahorro: 0,
      })
    } else if (pct < 60) {
      const excedente = ingresosMes-totalMes
      sugerencias.push({
        tipo:'excedente', icono:'💰',
        titulo: `Tenés $${fmt(excedente)} disponibles este mes`,
        detalle: `Solo usaste el ${Math.round(pct)}% de tus ingresos.`,
        accion: `Considerá ahorrar $${fmt(excedente*0.5)} de ese excedente.`,
        ahorro: excedente*0.5,
      })
    }
  }

  return sugerencias.slice(0,5)
}

// ── 4. PROYECCIÓN ─────────────────────────────────────────────────────────────
export function proyectarCierre(gastos) {
  const mes = getMesActual()
  const hoy = new Date()
  const diaHoy = hoy.getDate()
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0).getDate()
  const diasRestantes = diasMes - diaHoy
  const gastosMes = gastos.filter(g => g.fecha.startsWith(mes))
  const totalHastaHoy = gastosMes.reduce((s,g)=>s+(g.monto||0),0)
  const promDia = diaHoy > 0 ? totalHastaHoy/diaHoy : 0
  return { totalHastaHoy, promDia, proyeccion: totalHastaHoy+promDia*diasRestantes, diaHoy, diasMes, diasRestantes }
}

// ── 5. CHAT ───────────────────────────────────────────────────────────────────
export function responderPregunta(preguntaId, gastos, ingresos=[]) {
  const mes    = getMesActual()
  const mesAnt = getMesAnterior()
  const gastosMes  = gastos.filter(g => g.fecha.startsWith(mes))
  const gastosAnt  = gastos.filter(g => g.fecha.startsWith(mesAnt))
  const ingresosMes= ingresos.filter(i => i.fecha.startsWith(mes))
  const totalMes   = gastosMes.reduce((s,g)=>s+(g.monto||0),0)
  const totalIngr  = ingresosMes.reduce((s,i)=>s+(i.monto||0),0)
  const totalAnt   = gastosAnt.reduce((s,g)=>s+(g.monto||0),0)

  switch(preguntaId) {
    case 'donde_gasto_mas': {
      const top = analizarTopItems(gastos,mes).slice(0,3)
      if (!top.length) return 'No hay gastos registrados este mes.'
      const lista = top.map((x,i)=>`${i+1}. ${x.nombre} — $${fmt(x.monto)} (${x.pct}%)`).join('\n')
      return `Tus 3 mayores gastos este mes:\n\n${lista}\n\nEntre los tres suman $${fmt(top.reduce((s,x)=>s+x.monto,0))}.`
    }
    case 'como_voy_mes': {
      const { proyeccion, promDia, diasRestantes } = proyectarCierre(gastos)
      const pct = totalIngr>0 ? Math.round(totalMes/totalIngr*100) : null
      let resp = `Llevás $${fmt(totalMes)} gastados, a un ritmo de $${fmt(promDia)}/día.\n\nSi continuás así, cerrarás el mes en $${fmt(proyeccion)} (quedan ${diasRestantes} días).`
      if (pct!==null) resp += `\n\nEso sería el ${pct}% de tus ingresos ($${fmt(totalIngr)}).`
      return resp
    }
    case 'vs_mes_anterior': {
      if (!gastosAnt.length) return 'No hay datos del mes anterior para comparar.'
      const delta  = totalMes - totalAnt
      const cambio = totalAnt>0 ? Math.round(delta/totalAnt*100) : 0
      const emoji  = delta>0?'📈':'📉'
      return `${emoji} Este mes: $${fmt(totalMes)} vs $${fmt(totalAnt)} el mes pasado.\n\n${delta>0?`Aumentaste $${fmt(delta)} (${cambio}% más).`:`Bajaste $${fmt(Math.abs(delta))} (${Math.abs(cambio)}% menos). ¡Bien!`}`
    }
    case 'puedo_ahorrar': {
      if (!totalIngr) return 'Registrá tus ingresos para calcular tu capacidad de ahorro.'
      const saldo = totalIngr - totalMes
      const { proyeccion } = proyectarCierre(gastos)
      const saldoFin = totalIngr - proyeccion
      if (saldo<=0) return `Con $${fmt(totalMes)} gastados y $${fmt(totalIngr)} de ingresos, estás en déficit de $${fmt(Math.abs(saldo))}.`
      return `Excedente actual: $${fmt(saldo)}.\n\nProyectando al cierre: $${fmt(Math.max(0,saldoFin))} disponibles.\n\nRegla del 20%: deberías ahorrar $${fmt(totalIngr*0.2)}/mes.`
    }
    case 'que_puedo_reducir': {
      const sugs = generarSugerencias(gastos,totalIngr).filter(s=>s.ahorro>0)
      if (!sugs.length) return 'No encontré oportunidades claras de reducción. ¡Vas bien!'
      return sugs.map(s=>`${s.icono} ${s.titulo}\n${s.accion}`).join('\n\n')
    }
    default: return 'Seleccioná una de las opciones disponibles.'
  }
}

export const PREGUNTAS_CHAT = [
  { id:'donde_gasto_mas',   label:'¿En qué gasto más este mes?',      emoji:'🏆' },
  { id:'como_voy_mes',      label:'¿Cómo voy este mes?',              emoji:'📅' },
  { id:'vs_mes_anterior',   label:'¿Mejor o peor que el mes pasado?', emoji:'📊' },
  { id:'puedo_ahorrar',     label:'¿Cuánto puedo ahorrar?',           emoji:'💰' },
  { id:'que_puedo_reducir', label:'¿Qué puedo reducir?',              emoji:'✂️'  },
]
