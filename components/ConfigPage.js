'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

// Íconos disponibles para categorías personalizadas
const ICONOS = ['🛒','🍔','🚗','🏠','💊','🎬','👕','📚','⚡','🐾','✈️','💻','🎮','🏋️','🍷','☕','🎁','💈','🔧','📱']

export default function ConfigPage() {
  const { settings, saveSettings, t, CURRENCIES, DATE_FORMATS } = useApp()
  const [form, setForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('apariencia')
  // Categorías
  const [cats, setCats] = useState(settings.custom_categories || [])
  const [newCat, setNewCat] = useState({ nombre: '', icono: '🛒', color: '#3b82f6' })
  const [showNewCat, setShowNewCat] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  // Drag & drop
  const dragIdx = useRef(null)

  useEffect(() => { setForm({ ...settings }); setCats(settings.custom_categories || []) }, [settings])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await saveSettings({ ...form, custom_categories: cats })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Category handlers ──
  const addCat = () => {
    if (!newCat.nombre.trim()) return
    setCats(prev => [...prev, { ...newCat, id: Date.now().toString() }])
    setNewCat({ nombre: '', icono: '🛒', color: '#3b82f6' })
    setShowNewCat(false)
  }

  const deleteCat = (id) => setCats(prev => prev.filter(c => c.id !== id))

  const updateCat = (id, field, val) =>
    setCats(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))

  // ── Drag & drop ──
  const handleDragStart = (i) => { dragIdx.current = i }
  const handleDragOver = (e, i) => {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    const newCats = [...cats]
    const [moved] = newCats.splice(dragIdx.current, 1)
    newCats.splice(i, 0, moved)
    dragIdx.current = i
    setCats(newCats)
  }
  const handleDrop = () => { dragIdx.current = null }

  const S = styles

  const sections = [
    { id: 'apariencia', label: t('config.apariencia') || 'Apariencia', icon: '🎨' },
    { id: 'region',     label: t('config.regionalizacion') || 'Regional', icon: '🌍' },
    { id: 'idioma',     label: t('config.idioma') || 'Idioma', icon: '🗣️' },
    { id: 'categorias', label: t('config.categorias') || 'Categorías', icon: '🏷️' },
  ]

  return (
    <div style={S.wrap}>
      {/* SIDEBAR */}
      <aside style={S.sidebar}>
        <h2 style={S.sideTitle}>{t('config.title') || 'Configuración'}</h2>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{ ...S.sideBtn, ...(activeSection === s.id ? S.sideBtnActive : {}) }}>
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </aside>

      {/* CONTENT */}
      <div style={S.content}>

        {/* ── APARIENCIA ── */}
        {activeSection === 'apariencia' && (
          <Section title={t('config.apariencia') || 'Apariencia'} icon="🎨">
            <Field label={t('config.tema') || 'Tema'}>
              <div style={S.themeRow}>
                {[
                  { val: 'light', label: t('config.temaClaro') || 'Claro', icon: '☀️' },
                  { val: 'dark',  label: t('config.temaOscuro') || 'Oscuro', icon: '🌙' },
                  { val: 'system',label: t('config.temaSistema') || 'Sistema', icon: '💻' },
                ].map(opt => (
                  <button key={opt.val} onClick={() => set('theme', opt.val)}
                    style={{ ...S.themeBtn, ...(form.theme === opt.val ? S.themeBtnActive : {}) }}>
                    <span style={{ fontSize: 22 }}>{opt.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Field>
          </Section>
        )}

        {/* ── REGIONAL ── */}
        {activeSection === 'region' && (
          <Section title={t('config.regionalizacion') || 'Regional'} icon="🌍">
            <Field label={t('config.moneda') || 'Moneda'}>
              <select value={form.currency} onChange={e => {
                const cur = CURRENCIES.find(c => c.code === e.target.value)
                set('currency', cur.code)
                set('currency_symbol', cur.symbol)
              }} style={S.select}>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
                ))}
              </select>
            </Field>
            <Field label={t('config.formatoFecha') || 'Formato de fecha'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DATE_FORMATS.map(f => (
                  <label key={f.value} style={S.radioLabel}>
                    <input type="radio" name="date_format" value={f.value}
                      checked={form.date_format === f.value}
                      onChange={() => set('date_format', f.value)} />
                    <span style={{ fontSize: 14 }}>{f.label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </Section>
        )}

        {/* ── IDIOMA ── */}
        {activeSection === 'idioma' && (
          <Section title={t('config.idioma') || 'Idioma'} icon="🗣️">
            <Field label="Idioma / Language">
              <div style={S.themeRow}>
                {[
                  { val: 'es', label: 'Español', flag: '🇦🇷' },
                  { val: 'en', label: 'English', flag: '🇺🇸' },
                ].map(opt => (
                  <button key={opt.val} onClick={() => set('language', opt.val)}
                    style={{ ...S.themeBtn, ...(form.language === opt.val ? S.themeBtnActive : {}) }}>
                    <span style={{ fontSize: 28 }}>{opt.flag}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Field>
          </Section>
        )}

        {/* ── CATEGORÍAS ── */}
        {activeSection === 'categorias' && (
          <Section title={t('config.categorias') || 'Categorías'} icon="🏷️"
            subtitle={t('config.categoriasDesc') || 'Personalizá tus categorías de gastos'}>
            {/* Lista de categorías con drag & drop */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {cats.map((cat, i) => (
                <div key={cat.id} draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  style={S.catRow}>
                  <span style={{ cursor: 'grab', color: '#94a3b8', fontSize: 18 }}>⠿</span>
                  <span style={{ fontSize: 22 }}>{cat.icono}</span>
                  {editingCat === cat.id ? (
                    <>
                      <input value={cat.nombre} onChange={e => updateCat(cat.id, 'nombre', e.target.value)}
                        style={{ ...S.inp, flex: 1 }} />
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ICONOS.map(ic => (
                          <button key={ic} onClick={() => updateCat(cat.id, 'icono', ic)}
                            style={{ ...S.iconBtn, ...(cat.icono === ic ? S.iconBtnActive : {}) }}>
                            {ic}
                          </button>
                        ))}
                      </div>
                      <input type="color" value={cat.color} onChange={e => updateCat(cat.id, 'color', e.target.value)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer' }} />
                      <button onClick={() => setEditingCat(null)} style={S.btnSm}>✓</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{cat.nombre}</span>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: cat.color }} />
                      <button onClick={() => setEditingCat(cat.id)} style={S.btnSm}>✏️</button>
                      <button onClick={() => deleteCat(cat.id)} style={{ ...S.btnSm, color: '#ef4444' }}>🗑️</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Agregar nueva */}
            {showNewCat ? (
              <div style={{ ...S.catRow, flexWrap: 'wrap', gap: 10, background: '#eff6ff', border: '1.5px solid #3b82f6' }}>
                <input placeholder="Nombre…" value={newCat.nombre} onChange={e => setNewCat(p => ({ ...p, nombre: e.target.value }))}
                  style={{ ...S.inp, minWidth: 140 }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ICONOS.map(ic => (
                    <button key={ic} onClick={() => setNewCat(p => ({ ...p, icono: ic }))}
                      style={{ ...S.iconBtn, ...(newCat.icono === ic ? S.iconBtnActive : {}) }}>{ic}</button>
                  ))}
                </div>
                <input type="color" value={newCat.color} onChange={e => setNewCat(p => ({ ...p, color: e.target.value }))}
                  style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addCat} style={S.btnPrimary}>Agregar</button>
                  <button onClick={() => setShowNewCat(false)} style={S.btnGhost}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewCat(true)} style={S.btnOutline}>
                + {t('config.agregarCategoria') || 'Agregar categoría'}
              </button>
            )}
          </Section>
        )}

        {/* SAVE BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          {saved && <span style={{ color: '#10b981', fontWeight: 700, fontSize: 14, marginRight: 16, alignSelf: 'center' }}>
            ✓ {t('config.guardado') || '¡Guardado!'}
          </span>}
          <button onClick={handleSave} disabled={saving} style={S.btnSave}>
            {saving ? 'Guardando…' : (t('config.guardar') || 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, subtitle, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icon}</span>{title}
        </h3>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  )
}

const styles = {
  wrap:        { display: 'flex', gap: 24, minHeight: '70vh', flexWrap: 'wrap' },
  sidebar:     { width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  sideTitle:   { fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  sideBtn:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'left', width: '100%' },
  sideBtnActive:{ background: 'var(--accent-light)', color: 'var(--accent)' },
  content:     { flex: 1, background: 'var(--surface)', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow)' },
  themeRow:    { display: 'flex', gap: 12, flexWrap: 'wrap' },
  themeBtn:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 24px', borderRadius: 12, border: '2px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', minWidth: 90, color: 'var(--text-primary)' },
  themeBtnActive:{ borderColor: 'var(--accent)', background: 'var(--accent-light)' },
  select:      { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' },
  radioLabel:  { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' },
  catRow:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' },
  inp:         { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none' },
  iconBtn:     { fontSize: 18, padding: '4px', border: '2px solid transparent', borderRadius: 6, cursor: 'pointer', background: 'none' },
  iconBtnActive:{ borderColor: 'var(--accent)', background: 'var(--accent-light)' },
  btnSm:       { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, padding: 4 },
  btnPrimary:  { padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  btnGhost:    { padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  btnOutline:  { padding: '10px 20px', borderRadius: 10, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 14, width: '100%' },
  btnSave:     { padding: '11px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 14px rgba(59,130,246,.35)' },
}
