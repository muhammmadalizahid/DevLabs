import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { computeAndCacheScan, getCachedScan, triggerAsyncScan } from '@/lib/plagiarism/scanService'

// GET /api/plagiarism/scan/[testId]?threshold=0.7&force=0
export async function GET(req, { params }) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single()
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const resolvedParams = await params
  const url = new URL(req.url)
  const threshold = parseFloat(url.searchParams.get('threshold') ?? '0.7')
  const force = url.searchParams.get('force') === '1'
  const asyncMode = process.env.ENABLE_ASYNC_PLAGIARISM_SCAN === '1'

  if (!force) {
    const cached = await getCachedScan(resolvedParams.testId, threshold)
    if (cached) {
      if (asyncMode) {
        triggerAsyncScan(resolvedParams.testId, threshold)
      }
      return NextResponse.json({ ...cached, source: 'cache' })
    }
  }

  if (asyncMode && !force) {
    triggerAsyncScan(resolvedParams.testId, threshold)
    return NextResponse.json({ pairs: [], pending: true, source: 'async' })
  }

  const payload = await computeAndCacheScan(resolvedParams.testId, threshold)
  return NextResponse.json({ ...payload, source: 'fresh' })
}
