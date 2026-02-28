'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '../lib/supabase-browser'

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'es',
  currency: 'ARS',
  currency_symbol: '$',
  date_format: 'DD/MM/YYYY',
  custom_categories: [],
}

const CURRENCIES = [
  { code: 'ARS', symbol: '$',  name: 'Peso argentino' },
  { code: 'USD', symbol: 'US$', name: 'Dólar estadounidense' },
  { code: 'EUR', symbol: '€',  name: 'Euro' },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileño' },
  { code: 'CLP', symbol: '$',  name: 'Peso chileno' },
  { code: 'MXN', symbol: '$',  name: 'Peso mexicano' },
  { code: 'COP', symbol: '$',  name: 'Peso colombiano' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
  { code: 'UYU', symbol: '$U', name: 'Peso uruguayo' },
  { code: 'GBP', symbol: '£',  name: 'Libra esterlina' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA (31/12/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA (12/31/2025)' },
  { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD (2025-12-31)' },
]

// ─── i18n LOADER ──────────────────────────────────────────────────────────────
const messagesCache = {}

async function loadMessages(lang) {
  if (messagesCache[lang]) return messagesCache[lang]
  try {
    const res = await fetch(`/messages/${lang}.json`)
    const msgs = await res.json()
    messagesCache[lang] = msgs
    return msgs
  } catch {
    return messagesCache['es'] || {}
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
function formatCurrency(amount, currency, symbol) {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  } catch {
    return `${symbol}${(amount || 0).toLocaleString()}`
  }
}

function formatDate(dateStr, format) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  switch (format) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`
    default:           return `${dd}/${mm}/${yyyy}`
  }
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [messages, setMessages] = useState({})
  const [notifCount, setNotifCount] = useState(0)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const supabase = createClient()

  // ── Load settings from Supabase ──
  useEffect(() => {
    const init = async () => {
      // Primero obtenemos el usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) { setLoadingSettings(false); return }

      // Luego settings y notificaciones EN PARALELO (antes eran 3 llamadas en serie)
      const [settingsRes, notifRes] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
        supabase.from('notificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('leida', false),
      ])

      const merged = { ...DEFAULT_SETTINGS, ...(settingsRes.data || {}) }
      setSettings(merged)
      setNotifCount(notifRes.count || 0)

      // Tema: aplicar inmediatamente desde localStorage si existe (evita flash)
      const savedTheme = localStorage.getItem('theme') || merged.theme
      applyTheme(savedTheme)

      // i18n: cargar en paralelo con lo anterior hubiera requerido el idioma,
      // así que va después pero sin bloquear el render (setLoadingSettings primero)
      setLoadingSettings(false)
      loadMessages(merged.language).then(msgs => setMessages(msgs))
    }
    init()
  }, [])

  // ── System theme listener ──
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  function applyTheme(theme) {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', theme)
  }

  // ── Save settings ──
  const saveSettings = useCallback(async (newSettings) => {
    const merged = { ...settings, ...newSettings }
    setSettings(merged)
    applyTheme(merged.theme)

    if (merged.language !== settings.language) {
      const msgs = await loadMessages(merged.language)
      setMessages(msgs)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('user_settings').upsert({
      user_id: user.id,
      ...merged,
      updated_at: new Date().toISOString(),
    })
  }, [settings])

  // ── i18n translate ──
  const t = useCallback((key) => getNestedValue(messages, key), [messages])

  // ── Format helpers bound to settings ──
  const fmtMoney = useCallback(
    (n) => formatCurrency(n, settings.currency, settings.currency_symbol),
    [settings.currency, settings.currency_symbol]
  )
  const fmtDate = useCallback(
    (d) => formatDate(d, settings.date_format),
    [settings.date_format]
  )

  const refreshNotifCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('leida', false)
    setNotifCount(count || 0)
  }, [])

  return (
    <AppContext.Provider value={{
      settings, saveSettings, loadingSettings,
      t, fmtMoney, fmtDate,
      notifCount, setNotifCount, refreshNotifCount,
      CURRENCIES, DATE_FORMATS,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
