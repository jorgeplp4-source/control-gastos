import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/items?q=texto   — buscar ítems del usuario
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  let query = supabase
    .from('items')
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .eq('user_id', user.id)
    .order('nombre', { ascending: true })
    .limit(20)

  if (q.length >= 1) {
    query = query.ilike('nombre', `%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/items — crear nuevo ítem (n1, n2, n3 obligatorios)
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nombre, n1, n2, n3, unidad_default } = body

  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  if (!n1 || !n2 || !n3)  return NextResponse.json({ error: 'Los 3 niveles de categoría son obligatorios' }, { status: 400 })

  const { data, error } = await supabase
    .from('items')
    .upsert([{
      user_id: user.id,
      nombre: nombre.trim(),
      n1, n2, n3,
      unidad_default: unidad_default || 'unidad',
    }], { onConflict: 'user_id,nombre' })
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT /api/items — actualizar nombre, unidad y/o categoría
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, nombre, unidad_default, n1, n2, n3 } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('items')
    .update({ nombre: nombre.trim(), unidad_default, n1, n2, n3 })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/items — actualizar solo unidad_default
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, unidad_default } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('items')
    .update({ unidad_default })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/items?id=xxx
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
