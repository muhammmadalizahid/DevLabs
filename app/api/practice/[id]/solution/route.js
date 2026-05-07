import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/practice/[id]/solution
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabaseAdmin
    .from('practice_problems').select('solution_sql').eq('id', resolvedParams.id).single();
  return NextResponse.json({ solution_sql: data?.solution_sql ?? null });
}
