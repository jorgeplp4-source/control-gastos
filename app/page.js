'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Dashboard from '../components/Dashboard'
import ExpenseForm from '../components/ExpenseForm'
import ListView from '../components/ListView'

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetch('/api/gastos')
        .then(r => r.json())
        .then(data => { setGastos(Array.isArray(data) ? data : []); setLoading(false) })
    })
  }, [])

  const handleSave = async (form) => {
    const isEdit = !!form.id
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch('/api/gastos', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const record = await res.json()
    setGastos(prev => {
      const rest = prev.filter(g => g.id !== record.id)
      return [record, ...rest].sort((a, b) => b.fecha.localeCompare(a.fecha))
    })
    setEditTarget(null)
    setTab('listado')
    showToast(isEdit ? 'Gasto actualizado ✓' : 'Gasto registrado ✓')
  }

  const handleDelete = async (id) => {
    await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' })
    setGastos(prev => prev.filter(g => g.id !== id))
    showToast('Gasto eliminado', false)
  }

  const handleEdit = (g) => { setEditTarget(g); setTab('registro') }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⟳</div>
        <p style={{ fontWeight: 600 }}>Cargando…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {toast && (
        <div className="toast" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      <header style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>💰 Control de Gastos</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>{gastos.length} registros · {user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'registro', label: '➕ Registrar' },
              { id: 'listado', label: '📋 Listado' },
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== 'registro') setEditTarget(null) }}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, background: tab === t.id ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,.08)', color: tab === t.id ? '#fff' : '#94a3b8', boxShadow: tab === t.id ? '0 2px 12px rgba(59,130,246,.35)' : 'none', transition: 'all .15s' }}>
                {t.label}
              </button>
            ))}
            <button onClick={handleLogout}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'dashboard' && <Dashboard gastos={gastos} />}
        {tab === 'registro' && (
          <ExpenseForm
            key={editTarget?.id || 'new'}
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setEditTarget(null); setTab('listado') }}
          />
        )}
        {tab === 'listado' && (
          <ListView gastos={gastos} onDelete={handleDelete} onEdit={handleEdit} />
        )}
      </main>
    </div>
  )
}
