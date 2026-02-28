'use client'
import { useState, useRef, useCallback } from 'react'

/**
 * Parsea el texto transcripto en orden: ÍTEM · CANTIDAD · MONTO
 * Ejemplos:
 *   "nafta 2 litros 5000" → { itemQuery:'nafta', cantidad:'2', monto:'5000' }
 *   "luz 1 8500"           → { itemQuery:'luz',   cantidad:'1', monto:'8500' }
 *   "vino 3 botellas 4200" → { itemQuery:'vino',  cantidad:'3', monto:'4200' }
 *   "pan 1500"             → { itemQuery:'pan',   cantidad:'1', monto:'1500' }
 */
export function parseVoice(text) {
  // Normalizar: minúsculas, quitar puntos/comas extra
  const raw = text.trim().toLowerCase().replace(/[,\.]+/g, ' ').replace(/\s+/g, ' ')

  // Extraer todos los números del texto
  const nums = [...raw.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',', '.'))

  // Palabras que son unidades — ayudan a skipear al parsear
  const UNITS = ['litro','litros','kg','kilo','kilos','gramo','gramos','unidad','unidades',
                 'botella','botellas','lata','latas','caja','cajas','bolsa','bolsas',
                 'metro','metros','par','pares','docena','docenas','pack','packs',
                 'hora','horas','día','días','mes','meses']

  // Dividir en tokens
  const tokens = raw.split(' ')

  // Encontrar índice del primer número
  const firstNumIdx = tokens.findIndex(t => /^\d/.test(t))

  // Todo antes del primer número = nombre del ítem
  const itemQuery = firstNumIdx === -1
    ? raw
    : tokens.slice(0, firstNumIdx).join(' ').trim()

  if (nums.length === 0) return { itemQuery: raw, cantidad: '', monto: '' }
  if (nums.length === 1) return { itemQuery, cantidad: '1', monto: nums[0] }

  // Con 2+ números: primero = cantidad, último = monto
  // Si hay una unidad entre ellos, el monto es el último número
  return {
    itemQuery,
    cantidad: nums[0],
    monto:    nums[nums.length - 1],
  }
}

/**
 * Hook de entrada por voz usando Web Speech API
 * Retorna: { listening, supported, transcript, start, stop, error }
 */
export function useVoiceInput({ onResult, lang = 'es-AR' } = {}) {
  const [listening,   setListening]   = useState(false)
  const [transcript,  setTranscript]  = useState('')
  const [error,       setError]       = useState('')
  const recogRef = useRef(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback(() => {
    if (!supported) { setError('Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.'); return }
    setError(''); setTranscript('')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false
    recogRef.current = rec

    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = (e) => {
      setListening(false)
      if (e.error === 'no-speech')   setError('No se detectó voz. Intentá de nuevo.')
      else if (e.error === 'not-allowed') setError('Permiso de micrófono denegado.')
      else setError('Error: ' + e.error)
    }
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      onResult?.(text)
    }

    rec.start()
  }, [supported, lang, onResult])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, supported, transcript, error, start, stop }
}
