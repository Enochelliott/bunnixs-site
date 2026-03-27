import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logFanActivity } from '@/lib/fan-activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { creatorId } = await request.json();

    // Get subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, creator_id, expires_at')
      .eq('fan_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .single();

    if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 404 });

    // TODO: Cancel with payment provider
    // await northClient.cancelSubscription(sub.payment_provider_id);

    await supabase.from('subscriptions').update({
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    }).eq('id', sub.id);

    // Notify creator
    const { data: fanProfile } = await supabase
      .from('profiles').select('username').eq('id', user.id).single();

    await logFanActivity({
      fanId: user.id,
      creatorId,
      activityType: 'subscription_cancel',
    });

    return NextResponse.json({
      success: true,
      accessUntil: sub.expires_at,
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
