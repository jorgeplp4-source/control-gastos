'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '../lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useApp } from '../context/AppContext'

// ── Lazy loading: cada componente se descarga solo cuando el usuario
//    navega a esa pestaña. Recharts (~150kb) no bloquea el inicio. ──
function Spinner({ label = 'Cargando…' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 36, marginBottom: 10, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</div>
      <p style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{label}</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const Dashboard       = dynamic(() => import('../components/Dashboard'),        { ssr: false, loading: () => <Spinner label="Cargando dashboard…" /> })
const ExpenseForm     = dynamic(() => import('../components/ExpenseForm'),       { ssr: false, loading: () => <Spinner label="Cargando formulario…" /> })
const ListView        = dynamic(() => import('../components/ListView'),          { ssr: false, loading: () => <Spinner label="Cargando listado…" /> })
const RecurrentesPage = dynamic(() => import('../components/RecurrentesPage'),  { ssr: false, loading: () => <Spinner label="Cargando recurrentes…" /> })
// RecurrentesPage se renderiza dentro de ConfigPage, este import es para pre-cargar
const ConfigPage      = dynamic(() => import('../components/ConfigPage'),        { ssr: false, loading: () => <Spinner label="Cargando configuración…" /> })
const NotificationsBell = dynamic(() => import('../components/NotificationsBell'), { ssr: false })
const Onboarding = dynamic(() => import('../components/Onboarding'), { ssr: false })

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t, fmtMoney, settings, loadingSettings } = useApp()

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    // Timeout de seguridad: si en 10s no responde, redirige al login
    // Evita la pantalla de carga infinita en móvil con red lenta
    const timeout = setTimeout(() => {
      router.push('/login')
    }, 10000)

    supabase.auth.getUser().then(({ data: { user } }) => {
      clearTimeout(timeout)
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetch('/api/gastos')
        .then(r => r.json())
        .then(data => { setGastos(Array.isArray(data) ? data : []); setLoading(false) })
        .catch(() => setLoading(false))
    }).catch(() => {
      clearTimeout(timeout)
      router.push('/login')
    })

    return () => clearTimeout(timeout)
  }, [])

  const handleSave = async (form) => {
    const isEdit = !!form.id
    // Separar datos de recurrencia antes de enviar el gasto
    const { _recurrente, ...gastoData } = form

    const res = await fetch('/api/gastos', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gastoData),
    })
    const record = await res.json()

    // Si viene con recurrencia, guardarla en paralelo
    if (_recurrente && record.id) {
      fetch('/api/recurrentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n1: gastoData.n1, n2: gastoData.n2, n3: gastoData.n3, n4: gastoData.n4,
          monto: gastoData.monto, unidad: gastoData.unidad,
          observaciones: gastoData.observaciones,
          ..._recurrente,
        }),
      })
    }

    setGastos(prev => {
      const rest = prev.filter(g => g.id !== record.id)
      return [record, ...rest].sort((a, b) => b.fecha.localeCompare(a.fecha))
    })
    setEditTarget(null)
    setTab('listado')
    showToast(isEdit ? 'Gasto actualizado ✓' : _recurrente ? 'Gasto registrado + recurrencia creada ✓' : 'Gasto registrado ✓')
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

  const NAV_TABS = [
    { id: 'dashboard',    label: t('nav.dashboard') || 'Dashboard',     icon: '📊' },
    { id: 'registro',     label: t('nav.registro') || 'Registrar',       icon: '➕' },
    { id: 'listado',      label: t('nav.listado') || 'Listado',          icon: '📋' },
    { id: 'configuracion',label: t('nav.configuracion') || 'Config',     icon: '⚙️' },
  ]

  if (loading || loadingSettings) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: 'pulse 1s infinite' }}>⟳</div>
        <p style={{ fontWeight: 600 }}>{t('common.loading') || 'Cargando…'}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* TOAST */}
      {toast && (
        <div className="toast" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <header style={{ background: 'var(--header-bg)', boxShadow: '0 4px 24px rgba(0,0,0,.3)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--header-text)', letterSpacing: '-0.5px' }}>💰 Control de Gastos</h1>
            <p style={{ margin: 0, color: 'var(--header-muted)', fontSize: 11 }}>{gastos.length} registros · {user?.email}</p>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }} className="desktop-nav">
            {NAV_TABS.map(t => (
              <button key={t.id}
                onClick={() => { setTab(t.id); if (t.id !== 'registro') setEditTarget(null) }}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, background: tab === t.id ? 'linear-gradient(135deg,var(--accent),var(--accent-dark))' : 'rgba(255,255,255,.08)', color: tab === t.id ? '#fff' : 'var(--header-muted)', boxShadow: tab === t.id ? '0 2px 10px rgba(59,130,246,.35)' : 'none', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                {t.icon} {t.label}
              </button>
            ))}
            <NotificationsBell />
            <button onClick={handleLogout} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'var(--header-muted)', fontSize: 12, fontWeight: 600 }}>
              {t('nav.salir') || 'Salir'}
            </button>
          </nav>
        </div>

        {/* Mobile bottom nav */}
        <style>{`
          @media (max-width: 768px) {
            .desktop-nav { display: none !important; }
            .mobile-nav  { display: flex !important; }
          }
          @media (min-width: 769px) {
            .mobile-nav { display: none !important; }
          }
        `}</style>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'none', justifyContent: 'space-around', padding: '8px 0 max(8px, env(safe-area-inset-bottom))', zIndex: 100 }}>
        {NAV_TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== 'registro') setEditTarget(null) }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)', minWidth: 48 }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 800 : 500 }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ONBOARDING — solo para usuarios nuevos */}
      <Onboarding onComplete={() => setTab('registro')} />

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 80px' }}>
        {tab === 'dashboard'    && <Dashboard gastos={gastos} onNavigate={setTab} />}
        {tab === 'registro'     && (
          <ExpenseForm
            key={editTarget?.id || 'new'}
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setEditTarget(null); setTab('listado') }}
          />
        )}
        {tab === 'listado'      && <ListView gastos={gastos} onDelete={handleDelete} onEdit={(g) => { setEditTarget(g); setTab('registro') }} />}
        {tab === 'configuracion'&& <ConfigPage />}
      </main>
    </div>
  )
}
