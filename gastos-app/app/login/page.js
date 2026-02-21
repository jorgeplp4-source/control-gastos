'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMsg('¡Cuenta creada! Revisá tu email para confirmar y luego ingresá.')
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0',
    borderRadius: 10, fontSize: 15, background: '#fff', color: '#1a2332',
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.4)' }}>
        <div style={{ height: 5, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }} />
        <div style={{ padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2332' }}>Control de Gastos</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              {mode === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inp} minLength={6} />
            </div>

            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>{error}</div>}
            {msg   && <div style={{ background: '#d1fae5', color: '#059669', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>{msg}</div>}

            <button type="submit" disabled={loading}
              style={{ padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 14px rgba(59,130,246,.35)', marginTop: 4 }}>
              {loading ? 'Cargando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
            {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMsg(''); }}
              style={{ border: 'none', background: 'none', color: '#3b82f6', fontWeight: 700, fontSize: 13 }}>
              {mode === 'login' ? 'Registrate' : 'Ingresá'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
