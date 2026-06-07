import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { buildDatasetStructure, buildDatasetTablePreview } from '@/lib/datasets/buildDatasetStructure'

// GET /api/tests/[id]/datasets - dataset table previews for students attempting this test
export async function GET(req, { params }) {
  const resolvedParams = await params
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single()
  if (user?.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const previewDatasetId = url.searchParams.get('datasetId')
  const previewTable = url.searchParams.get('table')
  const previewPage = Number(url.searchParams.get('page') || '1')
  const previewLimit = Number(url.searchParams.get('limit') || '10')

  const { data: test } = await supabaseAdmin
    .from('tests')
    .select('id,classroom_id,is_published,questions(id,dataset_id)')
    .eq('id', resolvedParams.id)
    .single()
  if (!test || !test.is_published) return NextResponse.json({ error: 'Test not found or not published' }, { status: 404 })

  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('id,status')
    .eq('classroom_id', test.classroom_id)
    .eq('student_id', user.id)
    .eq('status', 'approved')
    .single()
  if (!enrollment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (previewDatasetId && previewTable) {
    const allowedIds = new Set((test.questions || []).map((q) => q.dataset_id).filter(Boolean))
    if (!allowedIds.has(previewDatasetId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const table = await buildDatasetTablePreview(previewDatasetId, previewTable, {
      refresh: false,
      previewLimit,
      page: previewPage,
    })
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    return NextResponse.json({ table })
  }

  const datasetIds = Array.from(new Set((test.questions || []).map((q) => q.dataset_id).filter(Boolean)))
  if (datasetIds.length === 0) return NextResponse.json({ datasets: [] })

  const { data: datasets, error } = await supabaseAdmin
    .from('datasets')
    .select('id,name,description')
    .in('id', datasetIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byId = new Map((datasets || []).map((d) => [d.id, d]))
  const ordered = datasetIds.map((id) => byId.get(id)).filter(Boolean)

  const result = []
  for (const dataset of ordered) {
    const tables = await buildDatasetStructure(dataset.id, { refresh: false, includeRows: true, previewLimit: 10 })
    result.push({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      tables,
    })
  }

  return NextResponse.json({ datasets: result })
}
