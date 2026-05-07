import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { executeQuery } from '@/lib/engine/execute';
import { evaluateAnswer } from '@/lib/engine/evaluate';

// GET /api/practice/[id]
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('practice_problems')
    .select('id,title,description,difficulty,dataset_id,order_sensitive,expected_output')
    .eq('id', resolvedParams.id).single();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Never send expected_output or solution to client in GET
  const { expected_output, ...safe } = data;
  return NextResponse.json(safe);
}
