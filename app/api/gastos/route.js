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
  const { cuotas, monto_total, fecha_primera_cuota, medio_pago } = _cuotas_config
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
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, _cuotas_config, ...fields } = body

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
    // Eliminar todas las cuotas de la misma compra
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
