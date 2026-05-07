import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { executeQuery } from '@/lib/engine/execute';
import { evaluateAnswer } from '@/lib/engine/evaluate';

// POST /api/practice/[id]/run — run + evaluate
export async function POST(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: problem } = await supabaseAdmin
    .from('practice_problems')
    .select('dataset_id, expected_output, order_sensitive')
    .eq('id', resolvedParams.id).single();

  if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });

  const { query } = await req.json();
  const result = await executeQuery(query, problem.dataset_id);

  let evaluation = null;
  if (!result.error) {
    evaluation = evaluateAnswer(result.rows, problem.expected_output, problem.order_sensitive);
  }

  return NextResponse.json({ ...result, evaluation });
}
