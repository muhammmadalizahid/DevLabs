import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/tests/[id]/questions
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('questions').select('*, datasets(name)')
    .eq('test_id', resolvedParams.id).order('position');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tests/[id]/questions
export async function POST(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { prompt, difficulty, expected_output, dataset_id, order_sensitive, points } = await req.json();
  if (!prompt?.trim() || !expected_output) return NextResponse.json({ error: 'prompt and expected_output required' }, { status: 400 });

  // Get next position
  const { count } = await supabaseAdmin.from('questions').select('id', { count: 'exact', head: true }).eq('test_id', resolvedParams.id);

  const { data, error } = await supabaseAdmin.from('questions').insert({
    test_id: resolvedParams.id,
    prompt: prompt.trim(),
    difficulty: difficulty || 'basic',
    expected_output,
    dataset_id: dataset_id || null,
    order_sensitive: order_sensitive ?? false,
    points: points ?? 1,
    position: (count ?? 0) + 1,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
