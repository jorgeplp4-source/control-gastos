'use client'
import { useState, useRef, useCallback } from 'react'

// ── Números escritos en español → dígito ─────────────────────────────────────
const NUMEROS = {
  cero:0, un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5,
  seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12,
  trece:13, catorce:14, quince:15, dieciséis:16, dieciseis:16,
  diecisiete:17, dieciocho:18, diecinueve:19, veinte:20,
  veintiuno:21, veintidós:22, veintidos:22, veintitrés:23, veintitres:23,
  veinticuatro:24, veinticinco:25, veintiséis:26, veintiseis:26,
  veintisiete:27, veintiocho:28, veintinueve:29, treinta:30,
  cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90,
  cien:100, ciento:100, doscientos:200, trescientos:300, cuatrocientos:400,
  quinientos:500, seiscientos:600, setecientos:700, ochocientos:800, novecientos:900,
  mil:1000, 'dos mil':2000, 'tres mil':3000, 'cuatro mil':4000,
  'cinco mil':5000, 'seis mil':6000, 'siete mil':7000, 'ocho mil':8000,
  'nueve mil':9000, 'diez mil':10000,
}

function wordsToNumber(text) {
  // Primero intenta multi-palabra (ej: "cinco mil")
  for (const [k, v] of Object.entries(NUMEROS)) {
    if (text.includes(k)) {
      // reemplaza "cinco mil trescientos" → aproximación simple
    }
  }
  // Parseo simple: suma tokens conocidos
  let total = 0, current = 0
  const tokens = text.split(' ')
  for (const t of tokens) {
    const n = NUMEROS[t]
    if (n === undefined) continue
    if (n === 1000) { current = current === 0 ? 1000 : current * 1000; total += current; current = 0 }
    else if (n >= 100) { current += n }
    else { current += n }
  }
  total += current
  return total > 0 ? total : null
}

/**
 * Parsea transcripción en orden: ÍTEM · CANTIDAD · MONTO
 * Soporta números escritos: "nafta dos litros cinco mil"
 */
export function parseVoice(text) {
  const raw = text.trim().toLowerCase()
    .replace(/[,\.]+/g, ' ')
    .replace(/\s+/g, ' ')

  // Reemplazar números escritos por dígitos (multi-palabra primero)
  let processed = raw
  // Multi-palabra de mayor a menor
  const multiPalabra = [
    ['diez mil',10000],['nueve mil',9000],['ocho mil',8000],['siete mil',7000],
    ['seis mil',6000],['cinco mil',5000],['cuatro mil',4000],['tres mil',3000],
    ['dos mil',2000],
  ]
  for (const [phrase, val] of multiPalabra) {
    processed = processed.replace(new RegExp(phrase, 'g'), String(val))
  }
  // Single-word
  for (const [word, val] of Object.entries(NUMEROS)) {
    if (word.includes(' ')) continue
    processed = processed.replace(new RegExp(`\\b${word}\\b`, 'g'), String(val))
  }

  // Extraer números
  const nums = [...processed.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',','.'))
  const tokens = processed.split(' ')
  const firstNumIdx = tokens.findIndex(t => /^\d/.test(t))

  const itemQuery = firstNumIdx === -1
    ? raw  // sin números: todo es nombre
    : raw.split(' ').slice(0, firstNumIdx).join(' ').trim()

  if (nums.length === 0) return { itemQuery: raw, cantidad: '', monto: '' }
  if (nums.length === 1) return { itemQuery, cantidad: '1', monto: nums[0] }
  return { itemQuery, cantidad: nums[0], monto: nums[nums.length - 1] }
}

// ── Text-to-Speech ────────────────────────────────────────────────────────────
export function speak(text, { rate=0.95, pitch=1, lang='es-AR' } = {}) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang; u.rate = rate; u.pitch = pitch
    u.onend = resolve; u.onerror = resolve
    window.speechSynthesis.speak(u)
  })
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useVoiceInput({ onResult, lang = 'es-AR' } = {}) {
  const [listening, setListening] = useState(false)
  const [error,     setError]     = useState('')
  const recogRef = useRef(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const listen = useCallback((onText, opts = {}) => {
    return new Promise((resolve, reject) => {
      if (!supported) { reject(new Error('no-support')); return }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.lang = opts.lang || lang
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.continuous = false
      recogRef.current = rec

      rec.onstart  = () => setListening(true)
      rec.onend    = () => setListening(false)
      rec.onerror  = (e) => {
        setListening(false)
        reject(e)
      }
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript
        onText?.(text)
        resolve(text)
      }
      rec.start()
    })
  }, [supported, lang])

  const start = useCallback(async () => {
    if (!supported) { setError('Tu navegador no soporta voz. Usá Chrome o Edge.'); return }
    setError('')
    try {
      const text = await listen(onResult)
      return text
    } catch(e) {
      if (e.error === 'no-speech') setError('No se detectó voz. Intentá de nuevo.')
      else if (e.error === 'not-allowed') setError('Permiso de micrófono denegado.')
      else setError('Error de micrófono.')
    }
  }, [supported, listen, onResult])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, supported, error, start, stop, listen, setError }
}
