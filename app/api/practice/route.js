import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/practice?difficulty=basic
export async function GET(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const difficulty = url.searchParams.get('difficulty');
  let query = supabaseAdmin.from('practice_problems').select('id,title,description,difficulty,position').order('position');
  if (difficulty) query = query.eq('difficulty', difficulty);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
