/**
 * lib/dashboardWidgets.js — Catálogo y helpers de widgets del Dashboard
 *
 * fullWidth: true  → ocupa todo el ancho (columna 1/-1 en CSS grid)
 * fullWidth: false → widget de media pantalla (en grid de 2 columnas)
 * alwaysOn: true   → no se puede ocultar
 * collapsible: false → no tiene botón de minimizar en el dashboard
 */
export const WIDGET_CATALOG = [
  {
    id: 'periodo',
    label: 'Selector de período',
    description: 'Filtro de fechas — base para todos los demás widgets',
    defaultVisible: true,
    collapsible: false,
    alwaysOn: true,
    fullWidth: true,
  },
  {
    id: 'kpis',
    label: 'KPIs principales',
    description: 'Total gastado, N° de gastos, ticket promedio y promedio/día',
    defaultVisible: true,
    collapsible: true,
    fullWidth: true,
  },
  {
    id: 'alertas',
    label: 'Alertas de presupuesto',
    description: 'Avisos cuando superás los límites de categoría definidos',
    defaultVisible: true,
    collapsible: false,
    fullWidth: true,
  },
  {
    id: 'ingresos_gastos',
    label: 'Ingresos vs Gastos',
    description: 'Saldo disponible, % gastado y gastos hormiga del período',
    defaultVisible: true,
    collapsible: true,
    fullWidth: true,
  },
  {
    id: 'cuotas',
    label: 'Cuotas activas',
    description: 'Resumen de compras en cuotas: deuda pendiente y progreso',
    defaultVisible: true,
    collapsible: true,
    fullWidth: false,
  },
  {
    id: 'inflacion',
    label: 'Inflación personal',
    description: 'Evolución de precios en tus compras con cantidad registrada',
    defaultVisible: true,
    collapsible: true,
    fullWidth: false,
  },
  {
    id: 'distribucion',
    label: 'Distribución por Tipo',
    description: 'Gráfico de torta por categoría principal (Fijos, Variables…)',
    defaultVisible: true,
    collapsible: true,
    fullWidth: false,
  },
  {
    id: 'top_subcategorias',
    label: 'Top Subcategorías',
    description: 'Ranking de subcategorías por monto gastado en el período',
    defaultVisible: true,
    collapsible: true,
    fullWidth: false,
  },
  {
    id: 'top_items_gasto',
    label: 'Top Ítems por Gasto',
    description: 'Los ítems en los que más dinero gastás',
    defaultVisible: true,
    collapsible: true,
    fullWidth: false,
  },
  {
    id: 'top_items_cantidad',
    label: 'Top Ítems por Cantidad',
    description: 'Los ítems que más comprás por volumen o unidades',
    defaultVisible: false,
    collapsible: true,
    fullWidth: false,
  },
]

/**
 * Combina el estado guardado en Supabase con el catálogo local.
 *  • Respeta el orden y visibilidad guardados por el usuario
 *  • Agrega widgets nuevos (no presentes en el estado guardado)
 *  • Descarta widgets obsoletos (no presentes en el catálogo)
 */
export function mergeWidgets(saved) {
  if (!Array.isArray(saved) || saved.length === 0) {
    return WIDGET_CATALOG.map(w => ({ ...w, visible: w.defaultVisible }))
  }
  const savedMap = Object.fromEntries(saved.map(w => [w.id, w]))
  const existing = saved
    .filter(sw => WIDGET_CATALOG.find(w => w.id === sw.id))
    .map(sw => {
      const cat = WIDGET_CATALOG.find(w => w.id === sw.id)
      return { ...cat, visible: cat.alwaysOn ? true : !!sw.visible }
    })
  const newWidgets = WIDGET_CATALOG
    .filter(w => !savedMap[w.id])
    .map(w => ({ ...w, visible: w.defaultVisible }))
  return [...existing, ...newWidgets]
}

/** Serializa para guardar en Supabase */
export function serializeWidgets(widgets) {
  return widgets.map(w => ({ id: w.id, visible: !!w.visible }))
}
