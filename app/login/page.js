'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState('login') // 'login' | 'signup'
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [msg, setMsg]           = useState('')
  const [showPass, setShowPass] = useState(false)
  const [emailFocus, setEmailFocus]   = useState(false)
  const [passFocus, setPassFocus]     = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  // Redirigir si ya está logueado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(translateError(error.message))
      } else {
        router.push('/')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(translateError(error.message))
      } else {
        setMsg('¡Cuenta creada! Revisá tu email para confirmar y luego ingresá.')
      }
    }
    setLoading(false)
  }

  // Traducir errores de Supabase al español
  function translateError(msg) {
    if (msg.includes('Invalid login credentials'))  return 'Email o contraseña incorrectos'
    if (msg.includes('Email not confirmed'))         return 'Confirmá tu email antes de ingresar'
    if (msg.includes('User already registered'))     return 'Ya existe una cuenta con ese email'
    if (msg.includes('Password should be'))          return 'La contraseña debe tener al menos 6 caracteres'
    if (msg.includes('Unable to validate'))          return 'Email inválido'
    return msg
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError('')
    setMsg('')
  }

  const inpStyle = (focused) => ({
    width: '100%', padding: '13px 16px', border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
    borderRadius: 12, fontSize: 15, background: '#fff', color: '#1a2332',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    boxShadow: focused ? '0 0 0 3px rgba(59,130,246,.15)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)' }}>
      {/* Panel izquierdo — branding (solo desktop) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, display: 'none' }} className="login-brand">
        <div style={{ fontSize: 72, marginBottom: 24 }}>💰</div>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-1px' }}>Control de Gastos</h1>
        <p style={{ color: '#64748b', fontSize: 16, textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
          Registrá, categorizá y entendé tus gastos diarios con un sistema jerárquico de 4 niveles.
        </p>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 280 }}>
          {['📊 Dashboard con gráficos en tiempo real', '🏷️ 104 categorías precargadas', '🔁 Gastos recurrentes automáticos', '⚡ Registro rápido desde inicio'].map(f => (
            <div key={f} style={{ color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Card */}
          <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.5)' }}>
            <div style={{ height: 5, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899)' }} />
            <div style={{ padding: '36px 32px 32px' }}>

              {/* Logo + título */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>💰</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2332', margin: '0 0 4px' }}>
                  {mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}
                </h1>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                  {mode === 'login' ? 'Ingresá a tu cuenta para continuar' : 'Empezá a controlar tus gastos'}
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Email
                  </label>
                  <input
                    type="email" value={email} required
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setEmailFocus(true)}
                    onBlur={() => setEmailFocus(false)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    style={inpStyle(emailFocus)}
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} value={password} required
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setPassFocus(true)}
                      onBlur={() => setPassFocus(false)}
                      placeholder="••••••••" minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      style={{ ...inpStyle(passFocus), paddingRight: 48 }}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0 }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {mode === 'signup' && password.length > 0 && password.length < 6 && (
                    <p style={{ margin: '5px 0 0', fontSize: 11, color: '#f59e0b' }}>Mínimo 6 caracteres</p>
                  )}
                </div>

                {/* Error / Success */}
                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⚠️ {error}
                  </div>
                )}
                {msg && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✅ {msg}
                  </div>
                )}

                {/* Botón submit */}
                <button type="submit" disabled={loading}
                  style={{ padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: loading ? '#94a3b8' : '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(59,130,246,.4)', transition: 'all .15s', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? (
                    <>
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                      {mode === 'login' ? 'Ingresando…' : 'Creando cuenta…'}
                    </>
                  ) : (
                    mode === 'login' ? '→ Ingresar' : '→ Crear cuenta'
                  )}
                </button>
              </form>

              {/* Switch modo */}
              <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {mode === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
                </span>
                <button onClick={switchMode}
                  style={{ border: 'none', background: 'none', color: '#3b82f6', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {mode === 'login' ? 'Registrate gratis' : 'Ingresá'}
                </button>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#334155' }}>
            Control de Gastos · Tus datos son privados y seguros 🔒
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @media (min-width: 768px) { .login-brand { display: flex !important; } }
      `}</style>
    </div>
  )
}
