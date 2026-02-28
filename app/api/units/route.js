import { createClient } from '../../../lib/supabase-server'
import { NextResponse } from 'next/server'

const SYSTEM_UNITS = ["bolsa","caja","día","docena","garrafa","gr","hora","kg","litro","mes","metro","ml","paquete","porción","rollo","unidad"]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: custom } = await supabase.from('user_units')
    .select('id, nombre, orden, activa')
    .eq('user_id', user.id).eq('activa', true).order('nombre')

  const customNames = new Set((custom || []).map(u => u.nombre))
  const system = SYSTEM_UNITS.filter(u => !customNames.has(u)).map((nombre) => ({
    id: `sys_${nombre}`, nombre, system: true,
  }))
  return NextResponse.json([...system, ...(custom || []).map(u => ({ ...u, system: false }))]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { nombre } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  const { data, error } = await supabase.from('user_units')
    .upsert([{ user_id: user.id, nombre: nombre.trim().toLowerCase(), activa: true }], { onConflict: 'user_id,nombre' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { nombre } = await request.json()
  await supabase.from('user_units').delete().eq('user_id', user.id).eq('nombre', nombre)
  return NextResponse.json({ ok: true })
}
