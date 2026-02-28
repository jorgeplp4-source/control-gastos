import { createClient } from '../../../../lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/items/all — todos los ítems del usuario sin filtro de búsqueda
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('items')
    .select('id, nombre, n1, n2, n3, unidad_default')
    .eq('user_id', user.id)
    .order('n1').order('n2', { nullsFirst: true }).order('nombre')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
