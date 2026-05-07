import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { generateExcel } from '@/lib/export/excel';

// GET /api/export/excel/[testId]
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: test } = await supabaseAdmin.from('tests').select('title').eq('id', resolvedParams.testId).single();
  const { data: submissions } = await supabaseAdmin
    .from('submissions').select('*, users(name,email)').eq('test_id', resolvedParams.testId)
    .order('total_score', { ascending: false });

  const buffer = await generateExcel(submissions ?? [], test?.title ?? 'Results');
  const filename = `${(test?.title ?? 'results').replace(/\s+/g, '_')}_results.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
