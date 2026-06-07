import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { gradeSubmission } from '@/lib/engine/gradeSubmission'
import { checkRateLimit, keyForReq } from '@/lib/middleware/rateLimit'
import { triggerAsyncScan } from '@/lib/plagiarism/scanService'

// POST /api/submissions/[id]/submit - evaluate and finalize submission
export async function POST(req, { params }) {
  const resolvedParams = await params
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single()
  const { data: submission } = await supabaseAdmin.from('submissions').select('*').eq('id', resolvedParams.id).single()

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  if (submission.student_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (submission.status === 'submitted') return NextResponse.json({ error: 'Already submitted' }, { status: 409 })

  const key = keyForReq(req, user.id)
  const rl = await checkRateLimit(
    key,
    parseInt(process.env.SUBMIT_RATE_LIMIT || '10', 10),
    parseInt(process.env.SUBMIT_RATE_WINDOW_MS || '60000', 10)
  )
  if (rl.limited) return NextResponse.json({ error: 'Too many submission attempts. Please wait a moment.' }, { status: 429 })

  const { data: test } = await supabaseAdmin.from('tests').select('time_limit_mins').eq('id', submission.test_id).single()
  if (test?.time_limit_mins) {
    const elapsed = (Date.now() - new Date(submission.started_at).getTime()) / 60000
    if (elapsed > test.time_limit_mins + 1) return NextResponse.json({ error: 'Time limit exceeded' }, { status: 403 })
  }

  const graded = await gradeSubmission(supabaseAdmin, resolvedParams.id)
  if (graded.error) return NextResponse.json({ error: graded.error }, { status: 500 })

  if (process.env.ENABLE_ASYNC_PLAGIARISM_SCAN === '1') {
    const threshold = parseFloat(process.env.PLAGIARISM_DEFAULT_THRESHOLD || '0.7')
    triggerAsyncScan(submission.test_id, threshold).catch(() => {})
  }

  return NextResponse.json(graded.submission)
}
