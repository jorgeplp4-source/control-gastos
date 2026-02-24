'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase-browser'

const PASOS = [
  {
    id: 'bienvenida',
    icon: '👋',
    titulo: '¡Bienvenido a Control de Gastos!',
    subtitulo: 'Tu asistente personal para registrar y entender tus gastos diarios.',
    color: '#3b82f6',
    contenido: ({ onNext }) => (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, textAlign: 'left' }}>
          {[
            { icon: '📊', titulo: 'Dashboard', desc: 'Visualizá tus gastos con gráficos claros' },
            { icon: '🏷️', titulo: '4 niveles', desc: 'Categorizá con precisión: Tipo › Área › Sub › Ítem' },
            { icon: '🔁', titulo: 'Recurrentes', desc: 'Automatizá gastos fijos que se repiten' },
            { icon: '⚡', titulo: 'Gasto rápido', desc: 'Registrá desde la pantalla de inicio' },
          ].map(f => (
            <div key={f.titulo} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{f.titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
        <button onClick={onNext} style={btnPrimary('#3b82f6')}>Empezar →</button>
      </div>
    )
  },
  {
    id: 'categorias',
    icon: '🏷️',
    titulo: 'Sistema de categorías jerárquico',
    subtitulo: 'Cada gasto se clasifica en 4 niveles para análisis detallados.',
    color: '#059669',
    contenido: ({ onNext, onPrev }) => (
      <div>
        <div style={{ marginBottom: 20 }}>
          {[
            { nivel: 'N1 · Tipo', ejemplo: 'Variables', color: '#059669', desc: 'La naturaleza del gasto' },
            { nivel: 'N2 · Área', ejemplo: 'Alimentación Básica', color: '#0891b2', desc: 'El área de vida afectada' },
            { nivel: 'N3 · Subcategoría', ejemplo: 'Proteínas Animales', color: '#7c3aed', desc: 'Categoría específica' },
            { nivel: 'N4 · Ítem', ejemplo: 'Pollo', color: '#db2777', desc: 'El producto o servicio exacto' },
          ].map((n, i) => (
            <div key={n.nivel} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: n.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{n.nivel}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 99, background: `${n.color}18`, color: n.color, fontSize: 12, fontWeight: 700 }}>{n.ejemplo}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#166534', fontWeight: 500 }}>
            💡 Ya tenés <strong>104 categorías del sistema</strong> precargadas. Podés agregar las tuyas desde Configuración → Categorías.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onPrev} style={btnGhost}>← Atrás</button>
          <button onClick={onNext} style={btnPrimary('#059669')}>Entendido →</button>
        </div>
      </div>
    )
  },
  {
    id: 'recurrentes',
    icon: '🔁',
    titulo: 'Configurá gastos automáticos',
    subtitulo: 'Servicios, alquileres y suscripciones se pueden registrar solos.',
    color: '#d97706',
    contenido: ({ onNext, onPrev }) => (
      <div>
        <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Al registrar cualquier gasto, podés activar el toggle <strong>🔁 Hacer recurrente</strong> para que se registre automáticamente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Electricidad y gas mensual', 'Netflix, Spotify, suscripciones', 'Alquiler o cuotas', 'Compras semanales habituales'].map(ej => (
              <div key={ej} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> {ej}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #fde68a' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 500 }}>
            ⚙️ Administrá todos tus recurrentes desde <strong>Configuración → Gastos Recurrentes</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onPrev} style={btnGhost}>← Atrás</button>
          <button onClick={onNext} style={btnPrimary('#d97706')}>¡Listo, empezar! 🚀</button>
        </div>
      </div>
    )
  },
]

const btnPrimary = (color) => ({
  padding: '12px 28px', borderRadius: 12, border: 'none',
  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
  color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
  boxShadow: `0 4px 14px ${color}44`, flex: 1,
})
const btnGhost = {
  padding: '12px 20px', borderRadius: 12, border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600,
  fontSize: 14, cursor: 'pointer',
}

const STORAGE_KEY = 'onboarding_done_v1'

export default function Onboarding({ onComplete }) {
  const [paso, setPaso] = useState(0)
  const [visible, setVisible] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Verificar si es usuario nuevo (sin gastos registrados)
    const checkNew = async () => {
      const done = localStorage.getItem(STORAGE_KEY)
      if (done) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Verificar fecha de creación — si se registró hace menos de 5 minutos, es nuevo
      const createdAt = new Date(user.created_at)
      const diffMin = (Date.now() - createdAt.getTime()) / 60000
      if (diffMin < 10) {
        setVisible(true)
      }
    }
    checkNew()
  }, [])

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    onComplete?.()
  }

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const pasoActual = PASOS[paso]
  const Contenido = pasoActual.contenido

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 24, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,.3)', overflow: 'hidden', animation: 'slideUp .3s ease' }}>
        {/* Barra de progreso */}
        <div style={{ height: 4, background: 'var(--border)' }}>
          <div style={{ height: '100%', width: `${((paso + 1) / PASOS.length) * 100}%`, background: pasoActual.color, transition: 'width .3s ease' }} />
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${pasoActual.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                {pasoActual.icon}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{pasoActual.titulo}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{pasoActual.subtitulo}</p>
              </div>
            </div>
            <button onClick={handleSkip} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
          </div>

          {/* Contenido del paso */}
          <Contenido
            onNext={paso < PASOS.length - 1 ? () => setPaso(p => p + 1) : handleComplete}
            onPrev={() => setPaso(p => p - 1)}
          />

          {/* Dots de progreso */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            {PASOS.map((_, i) => (
              <div key={i} style={{ width: i === paso ? 20 : 6, height: 6, borderRadius: 99, background: i === paso ? pasoActual.color : 'var(--border)', transition: 'all .2s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
