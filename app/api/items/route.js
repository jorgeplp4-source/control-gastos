import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Modelo: items(nombre, n1, n2?, n3?, unidad_default)
 * n1 = obligatorio. n2 y n3 = opcionales.
 * 
 * Ejemplos válidos:
 *   { nombre:"luz",  n1:"Fijos",     n2:null,                 n3:null }
 *   { nombre:"vino", n1:"Variables", n2:"Alimentación Básica", n3:"Bebidas" }
 *   { nombre:"pan",  n1:"Variables", n2:"Alimentación Básica", n3:null }
 */

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q') || ''

  let query = supabase
    .from('items')
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .eq('user_id', user.id)
    .order('nombre')
    .limit(30)

  if (q.length >= 1) query = query.ilike('nombre', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nombre, n1, n2, n3, unidad_default } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  if (!n1?.trim())     return NextResponse.json({ error: 'n1 (Tipo) requerido' }, { status: 400 })

  const { data, error } = await supabase.from('items')
    .upsert([{
      user_id: user.id,
      nombre:  nombre.trim(),
      n1:      n1.trim(),
      n2:      n2?.trim() || null,
      n3:      n3?.trim() || null,
      unidad_default: unidad_default || 'unidad',
    }], { onConflict: 'user_id,nombre' })
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, nombre, n1, n2, n3, unidad_default } = await request.json()
  if (!id)             return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  if (!n1?.trim())     return NextResponse.json({ error: 'n1 requerido' }, { status: 400 })

  const { data, error } = await supabase.from('items')
    .update({
      nombre: nombre.trim(),
      n1:     n1.trim(),
      n2:     n2?.trim() || null,
      n3:     n3?.trim() || null,
      unidad_default: unidad_default || 'unidad',
    })
    .eq('id', id).eq('user_id', user.id)
    .select('id, nombre, n1, n2, n3, unidad_default, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { data: item } = await supabase
    .from('items').select('nombre').eq('id', id).eq('user_id', user.id).single()
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Verificar gastos asociados
  const { count } = await supabase.from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('n4', item.nombre)
  if (count > 0)
    return NextResponse.json({ error: `Tiene ${count} gastos asociados`, count }, { status: 409 })

  const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
