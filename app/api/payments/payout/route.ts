import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PAYOUT STUB — Wire to Trolley/Paxum/USDC when ready
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, method } = await request.json();

    // Get wallet
    const { data: wallet } = await supabase
      .from('creator_wallets')
      .select('*')
      .eq('creator_id', user.id)
      .single();

    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    if (wallet.available_balance < 50) {
      return NextResponse.json({ error: 'Minimum payout is $50' }, { status: 400 });
    }
    if (wallet.available_balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // TODO: Send payout via Trolley/Paxum/USDC
    // await trolleyClient.createPayout({ amount, method, recipientId: user.id });

    // Record payout request
    await supabase.from('payouts').insert({
      creator_id: user.id,
      amount,
      method,
      status: 'pending',
    });

    // Deduct from wallet
    await supabase.from('creator_wallets').update({
      available_balance: wallet.available_balance - amount,
    }).eq('creator_id', user.id);

    return NextResponse.json({ success: true, message: 'Payout request submitted' });
  } catch (err) {
    console.error('Payout error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
