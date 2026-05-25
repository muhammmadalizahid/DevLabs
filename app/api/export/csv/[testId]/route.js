import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/export/csv/[testId]
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: test } = await supabaseAdmin.from('tests').select('title').eq('id', resolvedParams.testId).single();
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('*, users(name,email), submission_answers(*, questions(id, prompt, points, partial_grading, expected_output))')
    .eq('test_id', resolvedParams.testId)
    .order('total_score', { ascending: false });

  const header = [
    'Student Name', 'Email', 'Score', 'Max Score', 'Percentage', 'Status', 'Submitted At',
    'Question ID', 'Question Prompt', 'Question Points', 'Partial Enabled', 'Student Query', 'Actual Output', 'Expected Output', 'Answer Score'
  ];

  const rows = [];
  for (const s of (submissions ?? [])) {
    const pct = s.max_score > 0 ? Math.round((s.total_score / s.max_score) * 100) : 0;
    if (s.submission_answers && s.submission_answers.length) {
      for (const a of s.submission_answers) {
        rows.push([
          s.users?.name ?? '',
          s.users?.email ?? '',
          s.total_score ?? 0,
          s.max_score ?? 0,
          `${pct}%`,
          s.status,
          s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '',
          a.questions?.id ?? '',
          a.questions?.prompt ?? '',
          a.questions?.points ?? '',
          a.questions?.partial_grading ? 'true' : 'false',
          a.query_text ?? '',
          a.actual_output ? JSON.stringify(a.actual_output) : '',
          a.questions?.expected_output ? JSON.stringify(a.questions.expected_output) : '',
          a.score ?? 0,
        ]);
      }
    } else {
      rows.push([
        s.users?.name ?? '',
        s.users?.email ?? '',
        s.total_score ?? 0,
        s.max_score ?? 0,
        `${pct}%`,
        s.status,
        s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '',
        '', '', '', '', '', '', '',
      ]);
    }
  }

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const filename = `${(test?.title ?? 'results').replace(/\s+/g, '_')}_results.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
