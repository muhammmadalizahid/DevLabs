import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { generateExcel } from '@/lib/export/excel';
import { getDetailedSubmissionsForTest } from '@/lib/results/submissionDetails';

// GET /api/export/excel/[testId]
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: testAuth } = await supabaseAdmin
    .from('tests')
    .select('id,title,classrooms(teacher_id)')
    .eq('id', resolvedParams.testId)
    .single();
  if (!testAuth || testAuth.classrooms?.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: test } = await supabaseAdmin.from('tests').select('title').eq('id', resolvedParams.testId).single();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const minPct = Number(url.searchParams.get('minPct'));
  const maxPct = Number(url.searchParams.get('maxPct'));
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  let filtered;
  try {
    filtered = await getDetailedSubmissionsForTest(supabaseAdmin, resolvedParams.testId, { status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  if (from) filtered = filtered.filter((s) => s.submitted_at && new Date(s.submitted_at) >= new Date(from));
  if (to) filtered = filtered.filter((s) => s.submitted_at && new Date(s.submitted_at) <= new Date(to));
  if (!Number.isNaN(minPct)) filtered = filtered.filter((s) => (s.max_score > 0 ? ((s.total_score / s.max_score) * 100) : 0) >= minPct);
  if (!Number.isNaN(maxPct)) filtered = filtered.filter((s) => (s.max_score > 0 ? ((s.total_score / s.max_score) * 100) : 0) <= maxPct);

  const buffer = await generateExcel(filtered, test?.title ?? 'Results');
  const filename = `${(test?.title ?? 'results').replace(/\s+/g, '_')}_results.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
