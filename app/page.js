'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '../lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useApp } from '../context/AppContext'
import {
  IconDashboard, IconRegistrar, IconListado, IconConfig,
  IconCerrar, IconSpinner, IconSalir, IconBilletera, IconCheck,
} from '../lib/icons'

function Spinner({ label = 'Cargando…' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <IconSpinner size={36} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} aria-hidden="true" />
      <p style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{label}</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const Dashboard        = dynamic(() => import('../components/Dashboard'),       { ssr: false, loading: () => <Spinner label="Cargando dashboard…"     /> })
const ExpenseForm      = dynamic(() => import('../components/ExpenseForm'),      { ssr: false, loading: () => <Spinner label="Cargando formulario…"    /> })
const ListView         = dynamic(() => import('../components/ListView'),         { ssr: false, loading: () => <Spinner label="Cargando listado…"       /> })
const ConfigPage       = dynamic(() => import('../components/ConfigPage'),       { ssr: false, loading: () => <Spinner label="Cargando configuración…" /> })
const NotificationsBell = dynamic(() => import('../components/NotificationsBell'), { ssr: false })
const Onboarding       = dynamic(() => import('../components/Onboarding'),      { ssr: false })

// ── Definición de tabs — Icon: componente Phosphor ────────────────────────────
const NAV_TABS = [
  { id: 'dashboard',     labelKey: 'nav.dashboard',    fallback: 'Dashboard', Icon: IconDashboard },
  { id: 'registro',      labelKey: 'nav.registro',     fallback: 'Registrar', Icon: IconRegistrar },
  { id: 'listado',       labelKey: 'nav.listado',      fallback: 'Listado',   Icon: IconListado   },
  { id: 'configuracion', labelKey: 'nav.configuracion', fallback: 'Config',   Icon: IconConfig    },
]

export default function Home() {
  const [tab, setTab]         = useState('dashboard')
  const [gastos, setGastos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState(null)
  const [toast, setToast]     = useState(null)
  const [user, setUser]       = useState(null)
  const router   = useRouter()
  const supabase = createClient()
  const { t, loadingSettings } = useApp()

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const timeout = setTimeout(() => router.push('/login'), 10000)
    supabase.auth.getUser().then(({ data: { user } }) => {
      clearTimeout(timeout)
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetch('/api/gastos')
        .then(r => r.json())
        .then(d => { setGastos(Array.isArray(d) ? d : []); setLoading(false) })
        .catch(() => setLoading(false))
    }).catch(() => { clearTimeout(timeout); router.push('/login') })
    return () => clearTimeout(timeout)
  }, [])

  const handleSave = async (form) => {
    const isEdit = !!form.id
    const { _recurrente, ...gastoData } = form
    const res = await fetch('/api/gastos', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gastoData),
    })
    const record = await res.json()
    if (_recurrente && record.id) {
      fetch('/api/recurrentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n1: gastoData.n1, n2: gastoData.n2, n3: gastoData.n3, n4: gastoData.n4,
          monto: gastoData.monto, unidad: gastoData.unidad,
          observaciones: gastoData.observaciones, ..._recurrente,
        }),
      })
    }
    setGastos(prev => {
      const rest = prev.filter(g => g.id !== record.id)
      return [record, ...rest].sort((a, b) => b.fecha.localeCompare(a.fecha))
    })
    setEditTarget(null)
    if (isEdit) setTab('listado')   // solo volver al listado al editar, no al registrar nuevo
    showToast(isEdit ? 'Gasto actualizado' : _recurrente ? 'Gasto + recurrencia creados' : 'Gasto registrado')
  }

  const handleDelete = async (id) => {
    await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' })
    setGastos(prev => prev.filter(g => g.id !== id))
    showToast('Gasto eliminado', false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigateTo = (id) => { setTab(id); if (id !== 'registro') setEditTarget(null) }

  // ── Loading global ──────────────────────────────────────────────────────────
  if (loading || loadingSettings) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <IconSpinner size={48} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 12 }} aria-hidden="true" />
        <p style={{ fontWeight: 600 }}>{t('common.loading') || 'Cargando…'}</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div role="alert" aria-live="polite"
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.ok
            ? <IconCheck size={16} weight="bold" aria-hidden="true" />
            : <IconCerrar size={16} weight="bold" aria-hidden="true" />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--header-bg)', boxShadow: '0 4px 24px rgba(0,0,0,.3)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

          {/* Logo */}
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--header-text)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBilletera size={22} weight="fill" color="var(--header-text)" aria-hidden="true" />
              Control de Gastos
            </h1>
            <p style={{ margin: 0, color: 'var(--header-muted)', fontSize: 11 }}>{gastos.length} registros · {user?.email}</p>
          </div>

          {/* Desktop nav */}
          <nav className="desktop-nav" aria-label="Navegación principal"
            style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            {NAV_TABS.map(({ id, labelKey, fallback, Icon: NavIcon }) => {
              const active = tab === id
              return (
                <button key={id} onClick={() => navigateTo(id)}
                  aria-current={active ? 'page' : undefined}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all .15s', background: active ? 'linear-gradient(135deg,var(--accent),var(--accent-dark))' : 'rgba(255,255,255,.08)', color: active ? '#fff' : 'var(--header-muted)', boxShadow: active ? '0 2px 10px rgba(59,130,246,.35)' : 'none' }}>
                  <NavIcon size={15} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                  {t(labelKey) || fallback}
                </button>
              )
            })}
            <NotificationsBell />
            <button onClick={handleLogout} aria-label="Cerrar sesión"
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'var(--header-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconSalir size={14} aria-hidden="true" />
              {t('nav.salir') || 'Salir'}
            </button>
          </nav>
        </div>

        <style>{`
          @media(max-width:768px){.desktop-nav{display:none!important}.mobile-nav{display:flex!important}}
          @media(min-width:769px){.mobile-nav{display:none!important}}
        `}</style>
      </header>

      {/* ── MOBILE BOTTOM NAV ──────────────────────────────────────────────── */}
      <nav className="mobile-nav" aria-label="Navegación móvil"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'none', justifyContent: 'space-around', padding: '8px 0 max(8px,env(safe-area-inset-bottom))', zIndex: 100 }}>
        {NAV_TABS.map(({ id, labelKey, fallback, Icon: NavIcon }) => {
          const active = tab === id
          return (
            <button key={id} onClick={() => navigateTo(id)}
              aria-current={active ? 'page' : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', color: active ? 'var(--accent)' : 'var(--text-muted)', minWidth: 52, transition: 'color .15s' }}>
              <NavIcon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 500 }}>{t(labelKey) || fallback}</span>
            </button>
          )
        })}
      </nav>

      {/* ── ONBOARDING ─────────────────────────────────────────────────────── */}
      <Onboarding onComplete={() => setTab('registro')} />

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 80px' }}>
        {tab === 'dashboard'     && <Dashboard  gastos={gastos} onNavigate={navigateTo} />}
        {tab === 'registro'      && <ExpenseForm key={editTarget?.id || 'new'} initial={editTarget} onSave={handleSave} onCancel={() => { setEditTarget(null); setTab('listado') }} />}
        {tab === 'listado'       && <ListView   gastos={gastos} onDelete={handleDelete} onEdit={g => { setEditTarget(g); setTab('registro') }} />}
        {tab === 'configuracion' && <ConfigPage />}
      </main>
    </div>
  )
}
