import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { findSimilarPairs } from '@/lib/plagiarism/simple'

// GET /api/plagiarism/scan/[testId]?threshold=0.7
export async function GET(req, { params }) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single()
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const threshold = parseFloat(new URL(req.url).searchParams.get('threshold') ?? '0.7')
  const resolvedParams = await params

  // Fetch all submissions for test and their answers
  const { data: submissions } = await supabaseAdmin
    .from('submission_answers')
    .select('id, submission_id, query_text')
    .in('submission_id', supabaseAdmin.from('submissions').select('id').eq('test_id', resolvedParams.testId))

  // Fallback: if direct .in() didn't work, fetch by join
  let items = submissions
  if (!items) {
    const { data } = await supabaseAdmin
      .from('submissions')
      .select('id, submission_answers(id, query_text)')
      .eq('test_id', resolvedParams.testId)
    items = []
    for (const s of data ?? []) {
      for (const a of s.submission_answers ?? []) items.push({ id: a.id, submission_id: s.id, query_text: a.query_text })
    }
  }

  if (!items || items.length === 0) return NextResponse.json({ pairs: [] })

  const pairs = findSimilarPairs(items, threshold)
  // Attach any existing flags for these pairs
  const { data: flags } = await supabaseAdmin
    .from('plagiarism_flags')
    .select('test_id, a_submission_id, b_submission_id, status, reviewer_id, reviewed_at, score')
    .eq('test_id', resolvedParams.testId)

  const flagMap = new Map()
  for (const f of flags ?? []) {
    const a = f.a_submission_id?.toString();
    const b = f.b_submission_id?.toString();
    if (!a || !b) continue
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    flagMap.set(key, f)
  }

  const enriched = pairs.map(p => {
    const a = p.a.submission_id?.toString();
    const b = p.b.submission_id?.toString();
    const key = a && b ? (a < b ? `${a}:${b}` : `${b}:${a}`) : null
    const flag = key ? flagMap.get(key) : null
    return { ...p, flag: flag ?? null }
  })

  return NextResponse.json({ pairs: enriched })
}
