import { createClient } from '../../../../lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/items/usos — devuelve { [nombre_item]: count } para todos los ítems del usuario
// Se cruza por nombre del ítem vs n4 del gasto (así funciona la asignación actual)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Traer todos los ítems del usuario
  const { data: items } = await supabase
    .from('items')
    .select('nombre')
    .eq('user_id', user.id)

  if (!items?.length) return NextResponse.json({})

  // Contar ocurrencias de cada nombre en gastos.n4 (el campo donde se guarda el ítem)
  const { data: gastos } = await supabase
    .from('gastos')
    .select('n4')
    .eq('user_id', user.id)
    .in('n4', items.map(it => it.nombre))

  if (!gastos?.length) return NextResponse.json({})

  // Agregar por nombre
  const counts = {}
  for (const g of gastos) {
    if (g.n4) counts[g.n4] = (counts[g.n4] || 0) + 1
  }

  return NextResponse.json(counts)
}
