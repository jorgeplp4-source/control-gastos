// supabase/functions/process-recurring/index.ts
// Deploy: supabase functions deploy process-recurring

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function calcularProximaFecha(r: any, desde: Date): Date | null {
  const base = r.ultimo_proceso ? new Date(r.ultimo_proceso) : new Date(r.fecha_inicio)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  let next = new Date(base)
  next.setHours(0, 0, 0, 0)

  switch (r.frecuencia) {
    case 'diaria':
      next.setDate(next.getDate() + 1)
      break
    case 'semanal':
      next.setDate(next.getDate() + 7)
      break
    case 'quincenal':
      next.setDate(next.getDate() + 15)
      break
    case 'mensual':
      next.setMonth(next.getMonth() + 1)
      if (r.dia_del_mes) next.setDate(Math.min(r.dia_del_mes, 28))
      break
    case 'custom':
      next.setDate(next.getDate() + (r.intervalo_dias || 30))
      break
  }

  // Si la próxima fecha es hoy o anterior → corresponde procesar
  if (next <= hoy) return next
  return null
}

Deno.serve(async () => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hoyStr = hoy.toISOString().split('T')[0]

  // Traer todos los recurrentes activos
  const { data: recurrentes, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('activo', true)
    .or(`fecha_fin.is.null,fecha_fin.gte.${hoyStr}`)

  if (error) return new Response(JSON.stringify({ error }), { status: 500 })

  let procesados = 0
  let errores = 0

  for (const r of recurrentes ?? []) {
    try {
      const fechaProceso = calcularProximaFecha(r, hoy)
      if (!fechaProceso) continue

      const fechaStr = fechaProceso.toISOString().split('T')[0]

      // Verificar que no exista ya un gasto con este recurring_id y fecha
      const { count } = await supabase
        .from('gastos')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_id', r.id)
        .eq('fecha', fechaStr)

      if ((count ?? 0) > 0) continue // ya fue procesado

      // Insertar el gasto
      const { data: gasto } = await supabase
        .from('gastos')
        .insert({
          user_id: r.user_id,
          n1: r.n1, n2: r.n2, n3: r.n3, n4: r.n4,
          monto: r.monto,
          cantidad: 1,
          unidad: r.unidad,
          fecha: fechaStr,
          observaciones: r.observaciones ? `[Auto] ${r.observaciones}` : '[Gasto automático]',
          recurring_id: r.id,
        })
        .select()
        .single()

      // Actualizar ultimo_proceso
      await supabase
        .from('recurring_expenses')
        .update({ ultimo_proceso: fechaStr, updated_at: new Date().toISOString() })
        .eq('id', r.id)

      // Crear notificación interna
      await supabase.from('notificaciones').insert({
        user_id: r.user_id,
        tipo: 'recurrente',
        mensaje: `Gasto automático registrado: ${r.n4} — $${r.monto}`,
        data: { gasto_id: gasto?.id, recurring_id: r.id, fecha: fechaStr },
      })

      procesados++
    } catch (e) {
      errores++
      console.error('Error procesando recurrente', r.id, e)
    }
  }

  return new Response(
    JSON.stringify({ ok: true, procesados, errores, fecha: hoyStr }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
