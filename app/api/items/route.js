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
    .select('*')
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

// POST /api/items   — crear nuevo ítem
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nombre, n1, n2, n3, n4, unidad_default } = body

  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('items')
    .upsert([{ user_id: user.id, nombre: nombre.trim(), n1, n2, n3, n4, unidad_default: unidad_default || 'unidad' }],
      { onConflict: 'user_id,nombre' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/items   — actualizar unidad_default de un ítem
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
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
