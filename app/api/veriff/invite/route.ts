import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can generate invite links' }, { status: 403 });
    }

    // Generate unique token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Save invite
    const { data: invite, error } = await supabase
      .from('co_creator_invites')
      .insert({
        token: inviteToken,
        creator_id: user.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/co-creator/${inviteToken}`;

    return NextResponse.json({ inviteUrl, token: inviteToken, expiresAt: invite.expires_at });

  } catch (err) {
    console.error('Invite creation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
