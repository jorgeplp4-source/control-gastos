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
  mil:1000,
}

export function parseVoice(text) {
  const raw = text.trim().toLowerCase().replace(/[,\.]+/g, ' ').replace(/\s+/g, ' ')

  let processed = raw
  const multiPalabra = [
    ['diez mil',10000],['nueve mil',9000],['ocho mil',8000],['siete mil',7000],
    ['seis mil',6000],['cinco mil',5000],['cuatro mil',4000],['tres mil',3000],['dos mil',2000],
  ]
  for (const [phrase, val] of multiPalabra)
    processed = processed.replace(new RegExp(phrase, 'g'), String(val))
  for (const [word, val] of Object.entries(NUMEROS)) {
    if (word.includes(' ')) continue
    processed = processed.replace(new RegExp(`\\b${word}\\b`, 'g'), String(val))
  }

  const nums = [...processed.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',','.'))
  const tokens = processed.split(' ')
  const firstNumIdx = tokens.findIndex(t => /^\d/.test(t))
  const itemQuery = firstNumIdx === -1
    ? raw
    : raw.split(' ').slice(0, firstNumIdx).join(' ').trim()

  if (nums.length === 0) return { itemQuery: raw, cantidad: '', monto: '' }
  if (nums.length === 1) return { itemQuery, cantidad: '1', monto: nums[0] }
  return { itemQuery, cantidad: nums[0], monto: nums[nums.length - 1] }
}

// ── TTS — delay post-speech para evitar que el mic capture el eco ─────────────
export function speak(text, { rate=0.92, pitch=1, lang='es-AR', delay=700 } = {}) {
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

// ── Hook principal ────────────────────────────────────────────────────────────
export function useVoiceInput({ onResult, lang = 'es-AR' } = {}) {
  const [listening, setListening] = useState(false)
  const [error,     setError]     = useState('')
  const recogRef = useRef(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // listen: escucha UNA frase. Si no-speech, reintenta (maxRetries veces).
  const listen = useCallback((onText, opts = {}) => {
    const maxRetries = opts.retries ?? 2

    const tryOnce = () => new Promise((resolve, reject) => {
      if (!supported) { reject(new Error('no-support')); return }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.lang             = opts.lang || lang
      rec.interimResults   = false
      rec.maxAlternatives  = 3   // más alternativas → más chance de capturar "sí"
      rec.continuous       = false
      recogRef.current     = rec

      let settled = false
      const settle = (fn, val) => { if (!settled) { settled = true; setListening(false); fn(val) } }

      rec.onstart  = () => setListening(true)
      rec.onend    = () => settle(reject, { error: 'no-speech' })
      rec.onerror  = (e) => settle(reject, e)
      rec.onresult = (e) => {
        const alts   = [...e.results[0]]
        const best   = alts.sort((a,b) => b.confidence - a.confidence)[0]
        const text   = best.transcript.trim()
        onText?.(text)
        settle(resolve, text)
      }
      rec.start()
    })

    const run = async () => {
      let attempt = 0
      while (true) {
        try {
          return await tryOnce()
        } catch(e) {
          if ((e?.error === 'no-speech' || e?.error === 'aborted') && attempt < maxRetries) {
            attempt++
            await wait(200)
            continue
          }
          throw e
        }
      }
    }
    return run()
  }, [supported, lang])

  const start = useCallback(async () => {
    if (!supported) { setError('Tu navegador no soporta voz. Usá Chrome o Edge.'); return }
    setError('')
    try {
      const text = await listen(onResult)
      return text
    } catch(e) {
      if (e?.error === 'no-speech') setError('No se detectó voz. Intentá de nuevo.')
      else if (e?.error === 'not-allowed') setError('Permiso de micrófono denegado.')
      else setError('Error de micrófono.')
    }
  }, [supported, listen, onResult])

  const stop = useCallback(() => {
    try { recogRef.current?.stop() } catch {}
    setListening(false)
  }, [])

  return { listening, supported, error, setError, start, stop, listen }
}
