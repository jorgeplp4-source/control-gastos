/**
 * lib/dashboardWidgets.js — Catálogo y helpers de widgets del Dashboard
 *
 * Cada widget tiene:
 *   id            — clave única
 *   label         — nombre visible en Configuración
 *   description   — descripción corta
 *   defaultVisible — visibilidad por defecto
 *   collapsible   — si el usuario puede minimizarlo desde el dashboard
 *   alwaysOn      — no se puede ocultar (ej: selector de período)
 */
export const WIDGET_CATALOG = [
  {
    id: 'periodo',
    label: 'Selector de período',
    description: 'Filtro de fechas — base para todos los demás widgets',
    defaultVisible: true,
    collapsible: false,
    alwaysOn: true,
  },
  {
    id: 'kpis',
    label: 'KPIs principales',
    description: 'Total gastado, N° de gastos, ticket promedio y promedio/día',
    defaultVisible: true,
    collapsible: true,
  },
  {
    id: 'alertas',
    label: 'Alertas de presupuesto',
    description: 'Avisos cuando superás los límites de categoría definidos',
    defaultVisible: true,
    collapsible: false,
  },
  {
    id: 'ingresos_gastos',
    label: 'Ingresos vs Gastos',
    description: 'Saldo disponible, % gastado y gastos hormiga del período',
    defaultVisible: true,
    collapsible: true,
  },
  {
    id: 'distribucion',
    label: 'Distribución por Tipo',
    description: 'Gráfico de torta por categoría principal (Fijos, Variables…)',
    defaultVisible: true,
    collapsible: true,
  },
  {
    id: 'top_subcategorias',
    label: 'Top Subcategorías',
    description: 'Ranking de subcategorías por monto gastado en el período',
    defaultVisible: true,
    collapsible: true,
  },
  {
    id: 'top_items_gasto',
    label: 'Top Ítems por Gasto',
    description: 'Los ítems en los que más dinero gastás',
    defaultVisible: true,
    collapsible: true,
  },
  {
    id: 'top_items_cantidad',
    label: 'Top Ítems por Cantidad',
    description: 'Los ítems que más comprás por volumen o unidades',
    defaultVisible: false,
    collapsible: true,
  },
]

/**
 * Combina el estado guardado en Supabase con el catálogo local.
 *  • Respeta el orden y visibilidad guardados por el usuario
 *  • Agrega widgets nuevos (no presentes en el estado guardado)
 *  • Descarta widgets obsoletos (no presentes en el catálogo)
 *
 * @param {Array} saved — [{id, visible}] desde user_settings.dashboard_widgets
 * @returns {Array}     — widgets completos con metadatos del catálogo
 */
export function mergeWidgets(saved) {
  if (!Array.isArray(saved) || saved.length === 0) {
    return WIDGET_CATALOG.map(w => ({ ...w, visible: w.defaultVisible }))
  }

  const savedMap = Object.fromEntries(saved.map(w => [w.id, w]))

  // Widgets guardados que aún existen en el catálogo (respeta orden guardado)
  const existing = saved
    .filter(sw => WIDGET_CATALOG.find(w => w.id === sw.id))
    .map(sw => {
      const cat = WIDGET_CATALOG.find(w => w.id === sw.id)
      return { ...cat, visible: cat.alwaysOn ? true : !!sw.visible }
    })

  // Widgets nuevos en el catálogo que no estaban guardados (al final)
  const newWidgets = WIDGET_CATALOG
    .filter(w => !savedMap[w.id])
    .map(w => ({ ...w, visible: w.defaultVisible }))

  return [...existing, ...newWidgets]
}

/**
 * Serializa los widgets para guardar en Supabase (solo id + visible, ordenados).
 *
 * @param {Array} widgets — resultado de mergeWidgets
 * @returns {Array}       — [{id, visible}]
 */
export function serializeWidgets(widgets) {
  return widgets.map(w => ({ id: w.id, visible: !!w.visible }))
}
