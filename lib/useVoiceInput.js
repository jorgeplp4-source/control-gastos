'use client'
import { useState, useRef, useCallback } from 'react'

// ── Números escritos en español ───────────────────────────────────────────────
const NUMEROS_MULTI = [
  ['diez mil',10000],['nueve mil',9000],['ocho mil',8000],['siete mil',7000],
  ['seis mil',6000],['cinco mil',5000],['cuatro mil',4000],['tres mil',3000],['dos mil',2000],
]
const NUMEROS_SIMPLE = {
  cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,
  diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciséis:16,dieciseis:16,
  diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,
  treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,
  cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,
  quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900,mil:1000,
}

// Palabras de unidad a ignorar (no convertir a número)
const UNIDADES = new Set(['unidad','unidades','litro','litros','kg','kilo','kilos',
  'gramo','gramos','metro','metros','botella','botellas','lata','latas',
  'caja','cajas','bolsa','bolsas','par','pares','docena','docenas',
  'pack','packs','hora','horas','día','días','mes','meses'])

function normalizeText(text) {
  let t = text.trim().toLowerCase().replace(/[,\.]+/g,' ').replace(/\s+/g,' ')
  // Primero eliminar palabras de unidad para que no interfieran con el parseo
  t = t.split(' ').filter(w => !UNIDADES.has(w)).join(' ')
  for (const [phrase, val] of NUMEROS_MULTI)
    t = t.replace(new RegExp(phrase,'g'), String(val))
  for (const [word, val] of Object.entries(NUMEROS_SIMPLE))
    t = t.replace(new RegExp(`\\b${word}\\b`,'g'), String(val))
  return t
}

/**
 * Parsea transcripción en orden: CATEGORÍA/ÍTEM · CANTIDAD · MONTO
 * Retorna: { itemQuery, cantidad, monto }
 */
export function parseVoice(text) {
  const raw       = text.trim().toLowerCase().replace(/[,\.]+/g,' ').replace(/\s+/g,' ')
  const processed = normalizeText(text)
  const nums      = [...processed.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',','.'))
  const tokens    = processed.split(' ')
  const firstNum  = tokens.findIndex(t => /^\d/.test(t))

  const itemQuery = firstNum === -1
    ? raw
    : raw.split(' ').slice(0, firstNum).join(' ').trim()

  if (nums.length === 0) return { itemQuery: raw, cantidad:'', monto:'' }
  if (nums.length === 1) return { itemQuery, cantidad:'1', monto: nums[0] }
  return { itemQuery, cantidad: nums[0], monto: nums[nums.length - 1] }
}

/**
 * Resuelve la transcripción contra el catálogo completo.
 * Busca en orden: ítems guardados → N3 → N2 → N1
 * Si no hay match en ningún nivel, usa el texto como ítem libre.
 *
 * Retorna: {
 *   n1, n2, n3, n4,       ← campos del gasto
 *   cantidad, monto,
 *   matchLevel,           ← 'item'|'n3'|'n2'|'n1'|'libre'
 *   matchLabel,           ← nombre del match para feedback
 * }
 */
export function resolveVoice(parsed, { items=[], categories=[] } = {}) {
  const q        = (parsed.itemQuery || '').toLowerCase().trim()
  const cantidad = parsed.cantidad || '1'
  const monto    = parsed.monto    || ''

  if (!q) return null

  // ── 1. Buscar en ítems guardados ─────────────────────────────────────────
  const itemMatch = items
    .filter(it => it.nombre.toLowerCase().includes(q))
    .sort((a,b) => {
      const aS = a.nombre.toLowerCase().startsWith(q)
      const bS = b.nombre.toLowerCase().startsWith(q)
      return (aS&&!bS)?-1:(!aS&&bS)?1:a.nombre.localeCompare(b.nombre,'es')
    })[0]

  if (itemMatch) return {
    n1: itemMatch.n1||'Sin definir', n2: itemMatch.n2||'', n3: itemMatch.n3||'',
    n4: itemMatch.nombre, cantidad, monto, unidad: itemMatch.unidad_default||'unidad',
    matchLevel:'item', matchLabel: itemMatch.nombre,
  }

  // ── 2. Buscar en N3 ──────────────────────────────────────────────────────
  const seenN3 = new Map()
  categories.forEach(r => { if (r.n3_id && r.n3 && !seenN3.has(r.n3_id)) seenN3.set(r.n3_id, r) })
  const n3Match = [...seenN3.values()].find(r => r.n3.toLowerCase().includes(q))
  if (n3Match) return {
    n1: n3Match.n1, n2: n3Match.n2||'', n3: n3Match.n3,
    n4: 'Gasto general', cantidad, monto,
    matchLevel:'n3', matchLabel: n3Match.n3,
  }

  // ── 3. Buscar en N2 ──────────────────────────────────────────────────────
  const seenN2 = new Map()
  categories.forEach(r => { if (r.n2_id && r.n2 && !seenN2.has(r.n2_id)) seenN2.set(r.n2_id, r) })
  const n2Match = [...seenN2.values()].find(r => r.n2.toLowerCase().includes(q))
  if (n2Match) return {
    n1: n2Match.n1, n2: n2Match.n2, n3: '',
    n4: 'Gasto general', cantidad, monto,
    matchLevel:'n2', matchLabel: n2Match.n2,
  }

  // ── 4. Buscar en N1 ──────────────────────────────────────────────────────
  const seenN1 = new Map()
  categories.forEach(r => { if (r.n1_id && r.n1 && !seenN1.has(r.n1_id)) seenN1.set(r.n1_id, r) })
  const n1Match = [...seenN1.values()].find(r => r.n1.toLowerCase().includes(q))
  if (n1Match) return {
    n1: n1Match.n1, n2: '', n3: '',
    n4: 'Gasto general', cantidad, monto,
    matchLevel:'n1', matchLabel: n1Match.n1,
  }

  // ── 5. Ítem libre — usar texto como n4, n1="Sin definir" ────────────────
  return {
    n1:'Sin definir', n2:'', n3:'',
    n4: parsed.itemQuery,
    cantidad, monto,
    matchLevel:'libre', matchLabel: parsed.itemQuery,
  }
}

// ── TTS ───────────────────────────────────────────────────────────────────────
export function speak(text, { rate=0.92, pitch=1, lang='es-AR', delay=500 } = {}) {
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
export function useVoiceInput({ onResult, lang='es-AR' } = {}) {
  const [listening, setListening] = useState(false)
  const [error,     setError]     = useState('')
  const recogRef = useRef(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const listen = useCallback((onText, opts={}) => {
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
      const settle = (fn, val) => { if (!settled) { settled=true; setListening(false); fn(val) } }

      rec.onstart  = () => setListening(true)
      rec.onend    = () => settle(reject, { error:'no-speech' })
      rec.onerror  = (e) => settle(reject, e)
      rec.onresult = (e) => {
        const best = [...e.results[0]].sort((a,b)=>b.confidence-a.confidence)[0]
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
        catch(e) {
          if ((e?.error==='no-speech'||e?.error==='aborted') && attempt < maxRetries) {
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
