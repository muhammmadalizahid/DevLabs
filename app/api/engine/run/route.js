import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { executeQuery } from '@/lib/engine/execute'
import { validateQuery } from '@/lib/engine/query-validator'
import { enqueueExecution } from '@/lib/worker/queue'
import { checkRateLimit, keyForReq } from '@/lib/middleware/rateLimit'
import { getDatasetReadiness } from '@/lib/datasets/status'

// POST /api/engine/run
export async function POST(req) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const key = keyForReq(req, user.id)
  const rl = await checkRateLimit(
    key,
    parseInt(process.env.ENGINE_RATE_LIMIT || '60', 10),
    parseInt(process.env.ENGINE_RATE_WINDOW_MS || '60000', 10)
  )
  if (rl.limited) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

  const { query, dataset_id } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  if (!dataset_id) return NextResponse.json({ error: 'dataset_id is required' }, { status: 400 })

  const validation = validateQuery(query)
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })

  const readiness = await getDatasetReadiness(supabaseAdmin, dataset_id)
  if (!readiness.dataset) return NextResponse.json({ error: readiness.error }, { status: 404 })
  if (!readiness.ready) return NextResponse.json({ error: readiness.error }, { status: 400 })

  const useWorker = process.env.ENABLE_EXECUTION_WORKER === '1'
  const result = useWorker ? await enqueueExecution(query, dataset_id) : await executeQuery(query, dataset_id)
  return NextResponse.json(result)
}
