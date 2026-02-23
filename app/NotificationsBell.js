'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase-browser'
import { useApp } from '../context/AppContext'

export default function NotificationsBell() {
  const { notifCount, setNotifCount, fmtMoney, fmtDate } = useApp()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const supabase = createClient()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadNotifs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
    setLoading(false)
  }

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) loadNotifs()
  }

  const markAllRead = async () => {
    await supabase.from('notificaciones').update({ leida: true }).eq('leida', false)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
    setNotifCount(0)
  }

  const markOne = async (id) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setNotifCount(prev => Math.max(0, prev - 1))
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={handleOpen} style={NS.bell} title="Notificaciones">
        🔔
        {notifCount > 0 && (
          <span style={NS.badge}>{notifCount > 9 ? '9+' : notifCount}</span>
        )}
      </button>

      {open && (
        <div style={NS.dropdown}>
          <div style={NS.dropHeader}>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Notificaciones</span>
            {notifCount > 0 && (
              <button onClick={markAllRead} style={NS.markAll}>Marcar leídas</button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading && <div style={NS.empty}>Cargando…</div>}
            {!loading && !notifs.length && <div style={NS.empty}>Sin notificaciones</div>}
            {notifs.map(n => (
              <div key={n.id} onClick={() => !n.leida && markOne(n.id)}
                style={{ ...NS.item, background: n.leida ? 'transparent' : 'var(--accent-light)', cursor: n.leida ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: n.leida ? 400 : 600 }}>
                      {n.mensaje}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.leida && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const NS = {
  bell:       { position: 'relative', border: 'none', background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 18, color: '#94a3b8' },
  badge:      { position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropdown:   { position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 320, background: 'var(--surface)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,.2)', border: '1px solid var(--border)', zIndex: 999, overflow: 'hidden' },
  dropHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' },
  markAll:    { border: 'none', background: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  item:       { padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  empty:      { padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },
}
