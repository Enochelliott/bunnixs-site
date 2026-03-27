import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// Block a user
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targetId } = await request.json();
  if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 });
  if (targetId === user.id) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  const { error } = await supabase.from('blocked_users').upsert({
    blocker_id: user.id,
    blocked_id: targetId,
  }, { onConflict: 'blocker_id,blocked_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Unblock a user
export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targetId } = await request.json();

  const { error } = await supabase.from('blocked_users').delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Get block list
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id, created_at, profiles!blocked_users_blocked_id_fkey(username, avatar_url)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ blocked: data || [] });
}
