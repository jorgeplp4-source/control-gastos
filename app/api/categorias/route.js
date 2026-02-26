import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/categorias         — árbol completo
// GET /api/categorias?flat=1  — vista plana n1/n2/n3/n4
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
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('activa', true)
    .order('nivel').order('orden').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crear categoría propia del usuario
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('categorias')
    .insert([{ ...body, user_id: user.id, es_sistema: false }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PUT — actualizar categoría (propias O del sistema)
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  // Verificar que la categoría existe y es accesible (propia o sistema)
  const { data: cat } = await supabase
    .from('categorias').select('id, user_id, es_sistema').eq('id', id).single()
  if (!cat) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (cat.user_id !== null && cat.user_id !== user.id)
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  // Campos permitidos para editar
  const allowed = ['nombre', 'icono', 'color', 'orden', 'activa']
  const update  = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('categorias').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — eliminar categoría (propias O del sistema)
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { data: cat } = await supabase
    .from('categorias').select('nombre, nivel, user_id').eq('id', id).single()
  if (!cat) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (cat.user_id !== null && cat.user_id !== user.id)
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  // Verificar gastos asociados
  const fieldMap = { 1:'n1', 2:'n2', 3:'n3', 4:'n4' }
  const field = fieldMap[cat.nivel]
  if (field) {
    const { count } = await supabase.from('gastos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq(field, cat.nombre)
    if (count > 0)
      return NextResponse.json({ error: `Tiene ${count} gastos asociados. Reasignalos primero.`, count }, { status: 409 })
  }

  // Verificar hijos
  const { count: hijos } = await supabase.from('categorias')
    .select('id', { count: 'exact', head: true }).eq('parent_id', id)
  if (hijos > 0)
    return NextResponse.json({ error: `Tiene ${hijos} subcategorías. Eliminá las hijas primero.`, count: hijos }, { status: 409 })

  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
