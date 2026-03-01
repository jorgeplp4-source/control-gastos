import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ingresos')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  // Solo campos conocidos de la tabla
  const { fuente, monto, fecha, tipo, periodo, notas } = body
  const record = { fuente, monto, fecha, tipo: tipo||'fijo', periodo: periodo||'mensual', notas: notas||'' }

  const { data, error } = await supabase
    .from('ingresos')
    .insert([{ ...record, user_id: user.id }])
    .select()
    .single()

  if (error) {
    console.error('ingresos POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, fuente, monto, fecha, tipo, periodo, notas } = body
  const record = { fuente, monto, fecha, tipo: tipo||'fijo', periodo: periodo||'mensual', notas: notas||'' }

  const { data, error } = await supabase
    .from('ingresos')
    .update(record)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('ingresos PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const { error } = await supabase
    .from('ingresos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
