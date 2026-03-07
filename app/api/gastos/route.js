import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/gastos
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/gastos
// Si body._cuotas > 1, genera N registros con el mismo compra_id
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { _cuotas_config, ...gastoBase } = body

  // ── Caso simple: contado / sin cuotas ────────────────────────────────────
  if (!_cuotas_config || _cuotas_config.cuotas <= 1) {
    const { data, error } = await supabase
      .from('gastos')
      .insert([{ ...gastoBase, user_id: user.id }])
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // ── Caso cuotas: generar N registros ─────────────────────────────────────
  const { cuotas: cuotasRaw, monto_total, fecha_primera_cuota, medio_pago } = _cuotas_config
  const cuotas = Math.min(Math.max(2, cuotasRaw), 120)   // guardia: 2-120
  const montoCuota  = Math.round(monto_total / cuotas)
  const compra_id   = crypto.randomUUID()
  const fecha_compra = gastoBase.fecha  // fecha real de la compra

  const registros = Array.from({ length: cuotas }, (_, i) => {
    // Calcular fecha de cada cuota: mes siguiente × i desde fecha_primera_cuota
    const d = new Date(fecha_primera_cuota + 'T12:00:00')
    d.setMonth(d.getMonth() + i)
    const fecha = d.toISOString().split('T')[0]

    return {
      ...gastoBase,
      user_id:      user.id,
      fecha,
      fecha_compra,
      monto:        montoCuota,
      medio_pago:   medio_pago || 'credito',
      cuotas_total: cuotas,
      cuota_numero: i + 1,
      compra_id,
      // nombre: "Campera (1/3)", "Campera (2/3)", etc.
      n4: cuotas > 1 ? `${gastoBase.n4} (${i+1}/${cuotas})` : gastoBase.n4,
      observaciones: gastoBase.observaciones || '',
    }
  })

  const { data, error } = await supabase
    .from('gastos')
    .insert(registros)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Retornar el primer registro (cuota 1) para actualizar el estado local
  return NextResponse.json(data[0], { status: 201, headers: { 'X-Cuotas-Count': String(cuotas) } })
}

// PUT /api/gastos
// Si body tiene compra_id (sin id), actualiza todas las cuotas de esa compra
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, compra_id, _cuotas_config, ...fields } = body

  // ── Operaciones especiales por compra_id ─────────────────────────────────
  if (compra_id && !id) {

    // Recalcular monto de TODAS las cuotas
    if (fields.recalcular_monto !== undefined) {
      const nuevoMonto = parseFloat(fields.recalcular_monto)
      const { error } = await supabase
        .from('gastos').update({ monto: nuevoMonto })
        .eq('compra_id', compra_id).eq('user_id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, updated: 'all_monto' })
    }

    // Agregar cuotas nuevas al final
    if (fields.agregar_cuotas) {
      const nAgregar = parseInt(fields.agregar_cuotas)
      const cuotasTotalNueva = parseInt(fields.cuotas_total_nueva)
      const { data: existentes } = await supabase
        .from('gastos').select('*').eq('compra_id', compra_id).eq('user_id', user.id)
        .order('cuota_numero', { ascending: false })
      if (!existentes?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const ultima   = existentes[0]
      const baseName = (ultima.n4 || '').replace(/\s*\(\d+\/\d+\)$/, '').trim()

      // Actualizar cuotas_total en registros existentes + n4
      await Promise.all(existentes.map(c => {
        const newN4 = baseName ? `${baseName} (${c.cuota_numero}/${cuotasTotalNueva})` : c.n4
        return supabase.from('gastos').update({ cuotas_total: cuotasTotalNueva, n4: newN4 })
          .eq('id', c.id).eq('user_id', user.id)
      }))

      // Insertar los nuevos registros
      const { id: _ul, created_at: _ca, ...base } = ultima
      const nuevas = Array.from({ length: nAgregar }, (_, i) => {
        const d = new Date(ultima.fecha + 'T12:00:00')
        d.setMonth(d.getMonth() + i + 1)
        const numCuota = ultima.cuota_numero + i + 1
        return { ...base, fecha: d.toISOString().split('T')[0], cuota_numero: numCuota, cuotas_total: cuotasTotalNueva,
          n4: baseName ? `${baseName} (${numCuota}/${cuotasTotalNueva})` : ultima.n4, observaciones: ultima.observaciones || '' }
      })
      const { error } = await supabase.from('gastos').insert(nuevas)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, added: nAgregar })
    }

    // Reducir número de cuotas (eliminar las sobrantes + actualizar cuotas_total y n4)
    if (fields.reducir_cuotas_a !== undefined) {
      const nuevasTotal = parseInt(fields.reducir_cuotas_a)
      await supabase.from('gastos').delete()
        .eq('compra_id', compra_id).eq('user_id', user.id).gte('cuota_numero', nuevasTotal + 1)
      const { data: restantes } = await supabase
        .from('gastos').select('id, cuota_numero, n4').eq('compra_id', compra_id).eq('user_id', user.id)
      if (restantes?.length) {
        const baseName = (restantes[0]?.n4 || '').replace(/\s*\(\d+\/\d+\)$/, '').trim()
        await Promise.all(restantes.map(c =>
          supabase.from('gastos').update({ cuotas_total: nuevasTotal,
            n4: baseName ? `${baseName} (${c.cuota_numero}/${nuevasTotal})` : c.n4 })
            .eq('id', c.id).eq('user_id', user.id)
        ))
      }
      return NextResponse.json({ ok: true, reduced_to: nuevasTotal })
    }

    // Desplazar fechas de cuotas desde cuota_numero X en adelante
    if (fields.shift_fecha_desde_cuota !== undefined && fields.diff_meses !== undefined) {
      const desdeCuota = parseInt(fields.shift_fecha_desde_cuota)
      const diffMeses  = parseInt(fields.diff_meses)
      const { data: cuotas } = await supabase
        .from('gastos').select('id, fecha, cuota_numero').eq('compra_id', compra_id).eq('user_id', user.id)
        .gte('cuota_numero', desdeCuota)
      if (cuotas?.length) {
        await Promise.all(cuotas.map(c => {
          const d = new Date(c.fecha + 'T12:00:00')
          d.setMonth(d.getMonth() + diffMeses)
          return supabase.from('gastos').update({ fecha: d.toISOString().split('T')[0] })
            .eq('id', c.id).eq('user_id', user.id)
        }))
      }
      return NextResponse.json({ ok: true, shifted: cuotas?.length ?? 0 })
    }

    // Propagación de metadata (categoría, nombre, medio de pago) a TODAS las cuotas
    const { n4, n1, n2, n3, unidad, pendiente_revision, medio_pago } = fields
    const { data: cuotas, error: fetchErr } = await supabase
      .from('gastos').select('id, cuota_numero, cuotas_total')
      .eq('compra_id', compra_id).eq('user_id', user.id)
    if (fetchErr || !cuotas?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const total    = cuotas[0].cuotas_total
    const baseName = (n4 || '').replace(/\s*\(\d+\/\d+\)$/, '').trim()
    const common   = { n1: n1||'', n2: n2||'', n3: n3||'', unidad: unidad||'unidad', pendiente_revision: pendiente_revision ?? false,
      ...(medio_pago ? { medio_pago } : {}) }

    await Promise.all(cuotas.map(c =>
      supabase.from('gastos').update({ ...common,
        n4: baseName ? `${baseName} (${c.cuota_numero}/${total})` : c.n4,
      }).eq('id', c.id).eq('user_id', user.id)
    ))
    return NextResponse.json({ ok: true, updated: cuotas.length })
  }

  // ── Actualización individual por id ───────────────────────────────────────
  const { data, error } = await supabase
    .from('gastos')
    .update(fields)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/gastos?id=xxx&compra_id=xxx
// Si pasa compra_id elimina todas las cuotas de esa compra
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id        = searchParams.get('id')
  const compra_id = searchParams.get('compra_id')

  if (compra_id) {
    const desde_numero = searchParams.get('desde_numero')

    if (desde_numero) {
      // Eliminar cuotas desde la número X en adelante (cancelar pendientes)
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('compra_id', compra_id)
        .eq('user_id', user.id)
        .gte('cuota_numero', parseInt(desde_numero))
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, deleted: 'from_cuota', desde_numero })
    }

    // Eliminar TODAS las cuotas de la compra
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('compra_id', compra_id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: 'all_cuotas' })
  }

  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
