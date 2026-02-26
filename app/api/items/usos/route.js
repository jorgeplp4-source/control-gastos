import { createClient } from '../../../../lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: items } = await supabase
    .from('items').select('nombre').eq('user_id', user.id)
  if (!items?.length) return NextResponse.json({})

  const { data: gastos } = await supabase
    .from('gastos').select('n4').eq('user_id', user.id)
    .in('n4', items.map(it => it.nombre))
  if (!gastos?.length) return NextResponse.json({})

  const counts = {}
  for (const g of gastos) {
    if (g.n4) counts[g.n4] = (counts[g.n4] || 0) + 1
  }
  return NextResponse.json(counts)
}
