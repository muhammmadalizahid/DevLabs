import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'

// POST /api/plagiarism/review
// body: { a_submission_id, b_submission_id, test_id, action: 'ignore'|'reviewed', note?: string }
export async function POST(req) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single()
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { a_submission_id, b_submission_id, test_id, action, note } = body
  if (!a_submission_id || !b_submission_id || !test_id || !action) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const status = action === 'ignore' ? 'ignored' : action === 'reviewed' ? 'reviewed' : null
  if (!status) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  // Normalize order
  const a = a_submission_id.toString()
  const b = b_submission_id.toString()
  const [sa, sb] = a < b ? [a, b] : [b, a]

  // Upsert flag
  const { data, error } = await supabaseAdmin.from('plagiarism_flags').upsert({
    test_id,
    a_submission_id: sa,
    b_submission_id: sb,
    status,
    reviewer_id: user.id,
    note,
    reviewed_at: new Date().toISOString()
  }, { onConflict: ['test_id', 'a_submission_id', 'b_submission_id'] }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, flag: data })
}
