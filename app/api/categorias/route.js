import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/categorias         — árbol completo (para CategoryEditor)
// GET /api/categorias?flat=1  — vista plana n1/n2/n3/n4 (para CategorySearch)
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const flat = searchParams.get('flat') === '1'

  if (flat) {
    const { data, error } = await supabase
      .from('v_categorias_flat')
      .select('n1_id,n1,n2_id,n2,n3_id,n3,n4_id,n4,icono,color,orden')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('n1').order('n2').order('n3').order('orden').order('n4')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  }

  // Árbol completo para CategoryEditor
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('activa', true)
    .order('nivel').order('orden').order('nombre')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/categorias — crear categoría
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('categorias')
    .insert([{ ...body, user_id: user.id, es_sistema: false }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PUT /api/categorias — actualizar (solo las propias)
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await request.json()
  const { data, error } = await supabase
    .from('categorias')
    .update(fields)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/categorias?id=xxx
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const { data: cat } = await supabase.from('categorias').select('nombre, nivel').eq('id', id).single()
  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fieldMap = { 1: 'n1', 2: 'n2', 3: 'n3', 4: 'n4' }
  const field = fieldMap[cat.nivel]
  const { count } = await supabase
    .from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq(field, cat.nombre)

  if (count > 0) {
    return NextResponse.json({ error: `Esta categoría tiene ${count} gastos asociados. Reasignalos antes de eliminarla.`, count }, { status: 409 })
  }

  const { count: hijos } = await supabase
    .from('categorias')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)

  if (hijos > 0) {
    return NextResponse.json({ error: `Esta categoría tiene ${hijos} subcategorías. Eliminá las subcategorías primero.`, count: hijos }, { status: 409 })
  }

  const { error } = await supabase.from('categorias').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
