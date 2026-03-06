'use client'
import { useState, useRef, useCallback } from 'react'

// ── Unidades a ignorar ────────────────────────────────────────────────────────
const UNIDADES = new Set(['unidad','unidades','litro','litros','kg','kilo','kilos',
  'gramo','gramos','metro','metros','botella','botellas','lata','latas',
  'caja','cajas','bolsa','bolsas','par','pares','docena','docenas',
  'pack','packs','hora','horas','día','días','mes','meses'])

// ── Tabla de conversión de palabras a números ─────────────────────────────────
const CIENTOS = [
  ['novecientos',900],['ochocientos',800],['setecientos',700],['seiscientos',600],
  ['quinientos',500],['cuatrocientos',400],['trescientos',300],['doscientos',200],
  ['ciento',100],['cien',100],
]
const DECENAS = [
  ['noventa y nueve',99],['noventa y ocho',98],['noventa y siete',97],['noventa y seis',96],
  ['noventa y cinco',95],['noventa y cuatro',94],['noventa y tres',93],['noventa y dos',92],['noventa y uno',91],
  ['ochenta y nueve',89],['ochenta y ocho',88],['ochenta y siete',87],['ochenta y seis',86],
  ['ochenta y cinco',85],['ochenta y cuatro',84],['ochenta y tres',83],['ochenta y dos',82],['ochenta y uno',81],
  ['setenta y cinco',75],['setenta y cuatro',74],['setenta y tres',73],['setenta y dos',72],['setenta y uno',71],
  ['sesenta y cinco',65],['sesenta y cuatro',64],['sesenta y tres',63],['sesenta y dos',62],['sesenta y uno',61],
  ['cincuenta y cinco',55],['cincuenta y cuatro',54],['cincuenta y tres',53],['cincuenta y dos',52],['cincuenta y uno',51],
  ['cuarenta y cinco',45],['cuarenta y cuatro',44],['cuarenta y tres',43],['cuarenta y dos',42],['cuarenta y uno',41],
  ['treinta y cinco',35],['treinta y cuatro',34],['treinta y tres',33],['treinta y dos',32],['treinta y uno',31],
  ['veintinueve',29],['veintiocho',28],['veintisiete',27],['veintiséis',26],['veinticinco',25],
  ['veinticuatro',24],['veintitrés',23],['veintidós',22],['veintiuno',21],['veinte',20],
  ['diecinueve',19],['dieciocho',18],['diecisiete',17],['dieciséis',16],['dieciseis',16],
  ['quince',15],['catorce',14],['trece',13],['doce',12],['once',11],['diez',10],
  ['nueve',9],['ocho',8],['siete',7],['seis',6],['cinco',5],['cuatro',4],['tres',3],['dos',2],
  ['noventa',90],['ochenta',80],['setenta',70],['sesenta',60],['cincuenta',50],['cuarenta',40],['treinta',30],
]
const UNIDADES_NUM = [['una',1],['uno',1],['un',1]]
// Ordenar por longitud descendente para reemplazar frases largas primero
const ALL_WORDS = [...CIENTOS, ...DECENAS, ...UNIDADES_NUM].sort((a,b) => b[0].length - a[0].length)

/**
 * Convierte texto en español a número.
 * "ochenta mil" → 80000, "tres mil doscientos" → 3200, "mil quinientos" → 1500
 */
function normalizeText(text) {
  let t = text.trim().toLowerCase()
    .replace(/[,]+/g, ' ').replace(/\.+/g, ' ').replace(/\s+/g, ' ')

  // Eliminar palabras de unidad
  t = t.split(' ').filter(w => !UNIDADES.has(w)).join(' ')

  // Paso 1: resolver frases "X mil" donde X puede ser palabra o número
  // Hacemos 3 pasadas para cubrir casos compuestos como "ciento cincuenta mil"
  for (let pass = 0; pass < 3; pass++) {
    // "ochenta mil" → 80000, "doscientos mil" → 200000, etc.
    for (const [word, val] of ALL_WORDS)
      t = t.replace(new RegExp(`\\b${word}\\s+mil\\b`, 'g'), String(val * 1000))
    // "mil quinientos" → 1500, "mil doscientos" → 1200, etc.
    for (const [word, val] of [...CIENTOS, ...DECENAS]) {
      if (val < 1000)
        t = t.replace(new RegExp(`\\bmil\\s+${word}\\b`, 'g'), String(1000 + val))
    }
    // Sumar "Xmil + centena/decena": "3000 200" → "3200", "80000 500" → "80500"
    t = t.replace(/\b(\d+000)\s+(\d{1,3})\b(?!\d)/g, (_, miles, resto) => {
      const r = parseInt(resto)
      return r < 1000 ? String(parseInt(miles) + r) : miles + ' ' + resto
    })
  }

  // Paso 2: convertir palabras simples restantes
  t = t.replace(/\bmil\b/g, '1000')
  for (const [word, val] of ALL_WORDS)
    t = t.replace(new RegExp(`\\b${word}\\b`, 'g'), String(val))

  // Paso 2b: sumar "Xmil + centena" resultante de la conversión
  // "3000 200" → "3200" (yerba mate tres mil doscientos)
  // "100 50000" → "150000" (ciento cincuenta mil: primero suma ciento+cincuenta=150, luego *1000)
  // Sumar cientos sueltos + miles: "100 50000" → primero sumar 100+50=150 → impossible directo
  // En cambio: detectar "100 Xmil" donde 100 es centena y X ya fue convertido a miles
  t = t.replace(/\b(100|200|300|400|500|600|700|800|900)\s+(\d{4,})\b/g, (_, centena, miles) => {
    const c = parseInt(centena), m = parseInt(miles)
    // "100 50000" = 150000 solo si m es múltiplo de 1000 y c*1000 < m*10
    if (m % 1000 === 0) return String(c * 1000 + m)
    return centena + ' ' + miles
  })

  t = t.replace(/\b(\d+000)\s+(\d{1,3})\b(?!\d)/g, (_, miles, resto) => {
    const r = parseInt(resto)
    // Solo sumar si es una centena real (≥100), no decenas sueltas que pueden ser cuotas/cantidades
    return (r >= 100 && r < 1000) ? String(parseInt(miles) + r) : miles + ' ' + resto
  })

  // Paso 3: unir "X 000" → "X000" y "10 500" → "10500"
  t = t.replace(/(\d{2,})\s(\d{3})\b(?!\d)/g, '$1$2')
  t = t.replace(/(\d+)\s(0\d{2,})\b/g, '$1$2')
  t = t.replace(/(\d{2,})\s(\d{3})\b(?!\d)/g, '$1$2')

  return t.replace(/\s+/g, ' ').trim()
}

// ── Detección de cuotas y medio de pago ──────────────────────────────────────
const CUOTAS_PATTERNS = [
  /en\s+(\d+)\s+cuotas?/,
  /(\d+)\s+cuotas?/,
  /cuotas?\s+(\d+)/,
]
const MEDIO_PAGO_PATTERNS = {
  credito:      /tarjeta|visa|master|amex|crédito|credito|naranja|galicia|santander|bbva|macro|icbc|hsbc/,
  debito:       /débito|debito/,
  transferencia:/transfer|transf\b|mp\b|mercado\s*pago/,
  efectivo:     /efectivo|cash/,
}

// Opera sobre texto YA NORMALIZADO (números convertidos)
function detectCuotas(processedText) {
  for (const pat of CUOTAS_PATTERNS) {
    const m = processedText.match(pat)
    if (m) return parseInt(m[1], 10)
  }
  return 1
}

// Opera sobre texto ORIGINAL (palabras como "visa", "tarjeta")
function detectMedioPago(originalText) {
  const t = originalText.toLowerCase()
  for (const [medio, pat] of Object.entries(MEDIO_PAGO_PATTERNS)) {
    if (pat.test(t)) return medio
  }
  return 'efectivo'
}

// ── Stop words para limpiar el itemQuery ─────────────────────────────────────
const STOP_WORDS = new Set([
  'gasté','gaste','compré','compre','pagué','pague','registrá','registra',
  'un','una','unos','unas','el','la','los','las','de','del','al',
  'en','por','con','para','que','me','se','lo','le',
  'pesos','peso','plata','lucas',
  'cuota','cuotas','tarjeta','visa','master','mastercard','amex',
  'crédito','credito','débito','debito','efectivo','cash','transfer','transferencia',
])

/**
 * Parsea transcripción: ÍTEM · CANTIDAD · MONTO [· CUOTAS]
 * Retorna: { itemQuery, cantidad, monto, cuotas, medio_pago }
 */
export function parseVoice(text) {
  const processed = normalizeText(text)
  const tokens    = processed.split(' ')
  const nums      = [...processed.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',', '.'))
  const firstNum  = tokens.findIndex(t => /^\d/.test(t))

  // detectCuotas usa processed (números ya convertidos de texto)
  // detectMedioPago usa texto original (palabras como "visa", "tarjeta")
  const cuotas    = detectCuotas(processed)
  const medioBase = detectMedioPago(text)
  const medio_pago = cuotas > 1 && medioBase === 'efectivo' ? 'credito' : medioBase

  // Palabras del ítem: tokens antes del primer número, sin stop words
  const wordsBefore = firstNum === -1 ? tokens : tokens.slice(0, firstNum)
  const itemQuery   = wordsBefore
    .filter(w => w.length > 1 && !STOP_WORDS.has(w) && !/^\d/.test(w))
    .join(' ').trim()

  // Fallback: todos los tokens no-numéricos sin stop words
  const itemFinal = itemQuery || tokens
    .filter(w => w.length > 1 && !STOP_WORDS.has(w) && !/^\d/.test(w))
    .join(' ').trim()

  if (nums.length === 0) return { itemQuery: itemFinal, cantidad: '', monto: '', cuotas, medio_pago }
  if (nums.length === 1) return { itemQuery: itemFinal, cantidad: '1', monto: nums[0], cuotas, medio_pago }

  // Con 2+ números: excluir el número de cuotas del pool cantidad/monto
  const pool      = cuotas > 1 ? nums.filter(n => parseFloat(n) !== cuotas) : nums
  const efectivos = pool.length > 0 ? pool : nums
  const monto     = efectivos[efectivos.length - 1]
  const cantidad  = efectivos.length > 1 ? efectivos[0] : '1'

  return { itemQuery: itemFinal, cantidad, monto, cuotas, medio_pago }
}

/**
 * Resuelve la transcripción contra el catálogo completo.
 * Busca en orden: ítems guardados → N3 → N2 → N1
 */
export function resolveVoice(parsed, { items = [], categories = [] } = {}) {
  const q          = (parsed.itemQuery || '').toLowerCase().trim()
  const cantidad   = parsed.cantidad   || '1'
  const monto      = parsed.monto      || ''
  const cuotas     = parsed.cuotas     || 1
  const medio_pago = parsed.medio_pago || (cuotas > 1 ? 'credito' : 'efectivo')

  if (!q) return null

  const extra = { cuotas, medio_pago }

  // ── 1. Buscar en ítems guardados ─────────────────────────────────────────
  const itemMatch = items
    .filter(it => it.nombre.toLowerCase().includes(q))
    .sort((a, b) => {
      const aS = a.nombre.toLowerCase().startsWith(q)
      const bS = b.nombre.toLowerCase().startsWith(q)
      return (aS && !bS) ? -1 : (!aS && bS) ? 1 : a.nombre.localeCompare(b.nombre, 'es')
    })[0]

  if (itemMatch) return {
    n1: itemMatch.n1 || 'Sin definir', n2: itemMatch.n2 || '', n3: itemMatch.n3 || '',
    n4: itemMatch.nombre, cantidad, monto, unidad: itemMatch.unidad_default || 'unidad',
    matchLevel: 'item', matchLabel: itemMatch.nombre, ...extra,
  }

  // ── 2. Buscar en N3 ──────────────────────────────────────────────────────
  const seenN3 = new Map()
  categories.forEach(r => { if (r.n3_id && r.n3 && !seenN3.has(r.n3_id)) seenN3.set(r.n3_id, r) })
  const n3Match = [...seenN3.values()].find(r => r.n3.toLowerCase().includes(q))
  if (n3Match) return {
    n1: n3Match.n1, n2: n3Match.n2 || '', n3: n3Match.n3,
    n4: 'Gasto general', cantidad, monto,
    matchLevel: 'n3', matchLabel: n3Match.n3, ...extra,
  }

  // ── 3. Buscar en N2 ──────────────────────────────────────────────────────
  const seenN2 = new Map()
  categories.forEach(r => { if (r.n2_id && r.n2 && !seenN2.has(r.n2_id)) seenN2.set(r.n2_id, r) })
  const n2Match = [...seenN2.values()].find(r => r.n2.toLowerCase().includes(q))
  if (n2Match) return {
    n1: n2Match.n1, n2: n2Match.n2, n3: '',
    n4: 'Gasto general', cantidad, monto,
    matchLevel: 'n2', matchLabel: n2Match.n2, ...extra,
  }

  // ── 4. Buscar en N1 ──────────────────────────────────────────────────────
  const seenN1 = new Map()
  categories.forEach(r => { if (r.n1_id && r.n1 && !seenN1.has(r.n1_id)) seenN1.set(r.n1_id, r) })
  const n1Match = [...seenN1.values()].find(r => r.n1.toLowerCase().includes(q))
  if (n1Match) return {
    n1: n1Match.n1, n2: '', n3: '',
    n4: 'Gasto general', cantidad, monto,
    matchLevel: 'n1', matchLabel: n1Match.n1, ...extra,
  }

  // ── 5. No encontrado → guardar como libre (pendiente revisión) ────────────
  return {
    n1: 'Sin definir', n2: '', n3: '',
    n4: q || 'Gasto libre', cantidad, monto,
    matchLevel: 'libre', matchLabel: q,
    pendiente: true,
    ...extra,
  }
}

// ── TTS ───────────────────────────────────────────────────────────────────────
export function speak(text, { rate = 0.92, pitch = 1, lang = 'es-AR', delay = 500 } = {}) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTimeout(resolve, delay); return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang; u.rate = rate; u.pitch = pitch
    u.onend   = () => setTimeout(resolve, delay)
    u.onerror = () => setTimeout(resolve, delay)
    window.speechSynthesis.speak(u)
  })
}

const wait = (ms) => new Promise(r => setTimeout(r, ms))

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useVoiceInput({ onResult, lang = 'es-AR' } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError]         = useState('')
  const recogRef = useRef(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const listen = useCallback((onText, opts = {}) => {
    const maxRetries = opts.retries ?? 1

    const tryOnce = () => new Promise((resolve, reject) => {
      if (!supported) { reject(new Error('no-support')); return }
      const SR  = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.lang            = opts.lang || lang
      rec.interimResults  = false
      rec.maxAlternatives = 3
      rec.continuous      = false
      recogRef.current    = rec

      let settled = false
      const settle = (fn, val) => { if (!settled) { settled = true; setListening(false); fn(val) } }

      rec.onstart  = () => setListening(true)
      rec.onend    = () => settle(reject, { error: 'no-speech' })
      rec.onerror  = (e) => settle(reject, e)
      rec.onresult = (e) => {
        const best = [...e.results[0]].sort((a, b) => b.confidence - a.confidence)[0]
        const text = best.transcript.trim()
        onText?.(text)
        settle(resolve, text)
      }
      rec.start()
    })

    const run = async () => {
      let attempt = 0
      while (true) {
        try { return await tryOnce() }
        catch (e) {
          if ((e?.error === 'no-speech' || e?.error === 'aborted') && attempt < maxRetries) {
            attempt++; await wait(200); continue
          }
          throw e
        }
      }
    }
    return run()
  }, [supported, lang])

  const stop = useCallback(() => {
    try { recogRef.current?.stop() } catch {}
    setListening(false)
  }, [])

  return { listening, supported, error, setError, listen, stop }
}
