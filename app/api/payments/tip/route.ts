import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { creatorId, postId, amount, message } = await request.json();
    if (!creatorId || !amount || amount < 1) return NextResponse.json({ error: 'Invalid tip' }, { status: 400 });

    const admin = createSupabaseAdminClient();

    // Record tip in wallet_transactions
    await admin.from('wallet_transactions').insert({
      creator_id: creatorId,
      fan_id: user.id,
      type: 'tip',
      amount,
      post_id: postId || null,
      message: message || null,
      status: 'completed', // TODO: wire to actual payment processor
    });

    // Update creator wallet
    const { data: wallet } = await admin.from('creator_wallets').select('*').eq('creator_id', creatorId).single();
    if (wallet) {
      await admin.from('creator_wallets').update({
        available_balance: (wallet.available_balance || 0) + amount,
        total_earned: (wallet.total_earned || 0) + amount,
      }).eq('creator_id', creatorId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Tip error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
