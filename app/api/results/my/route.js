import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'

function pct(submission) {
  return submission.max_score > 0
    ? Math.round(((submission.total_score || 0) / submission.max_score) * 100)
    : 0
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: submissions, error: submissionsError } = await supabaseAdmin
    .from('submissions')
    .select('id,test_id,total_score,max_score,status,started_at,submitted_at')
    .eq('student_id', user.id)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })

  if (submissionsError) return NextResponse.json({ error: submissionsError.message }, { status: 500 })

  const rows = submissions || []
  if (rows.length === 0) return NextResponse.json([])

  const testIds = [...new Set(rows.map((row) => row.test_id).filter(Boolean))]
  const testMap = new Map()
  if (testIds.length > 0) {
    const { data: tests, error: testsError } = await supabaseAdmin
      .from('tests')
      .select('id,title,classroom_id')
      .in('id', testIds)
    if (testsError) return NextResponse.json({ error: testsError.message }, { status: 500 })
    for (const test of tests || []) testMap.set(test.id, test)
  }

  const { data: cohortRows, error: cohortError } = await supabaseAdmin
    .from('submissions')
    .select('test_id,total_score,max_score,status')
    .in('test_id', testIds)
    .eq('status', 'submitted')

  if (cohortError) return NextResponse.json({ error: cohortError.message }, { status: 500 })

  const cohortByTest = new Map()
  for (const row of cohortRows || []) {
    if ((row.max_score || 0) <= 0) continue
    const list = cohortByTest.get(row.test_id) || []
    list.push(pct(row))
    cohortByTest.set(row.test_id, list)
  }

  return NextResponse.json(rows.map((submission) => {
    const cohort = cohortByTest.get(submission.test_id) || []
    const classAveragePct = cohort.length > 0
      ? Math.round(cohort.reduce((sum, value) => sum + value, 0) / cohort.length)
      : null

    return {
      ...submission,
      test_title: testMap.get(submission.test_id)?.title || 'Untitled test',
      percentage: pct(submission),
      class_average_pct: classAveragePct,
    }
  }))
}
