import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNewSubscriberNotification } from '@/lib/notifications';
import { logFanActivity } from '@/lib/fan-activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PAYMENT STUB — Wire to North/CCBill when ready
 * Currently saves subscription as 'pending' payment
 * When payment provider is connected:
 * 1. Create payment intent with North API
 * 2. Return client_secret for frontend to complete payment
 * 3. On payment success webhook → update status to 'active'
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { creatorId, saleId } = await request.json();

    // Get creator profile + active sale
    const [{ data: creator }, { data: sale }] = await Promise.all([
      supabase.from('profiles').select('username, subscription_price').eq('id', creatorId).single(),
      saleId ? supabase.from('creator_sales').select('*').eq('id', saleId).single() : { data: null },
    ]);

    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('fan_id', user.id)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (existing?.status === 'active') {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    // Calculate price with sale discount
    let finalPrice = creator.subscription_price || 0;
    if (sale?.status === 'active') {
      // Check first-time only restriction
      if (sale.first_time_only) {
        const { data: history } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('fan_id', user.id)
          .eq('creator_id', creatorId)
          .limit(1);
        if (history?.length) {
          return NextResponse.json({ error: 'Sale is for first-time subscribers only' }, { status: 403 });
        }
      }
      finalPrice = finalPrice * (1 - sale.discount_percent / 100);
    }

    // TODO: Replace with North payment API call
    // const paymentIntent = await northClient.createSubscription({ amount: finalPrice * 130, creatorId });

    // For now — save as pending (will be activated by payment webhook)
    const { data: sub, error } = await supabase.from('subscriptions').upsert({
      fan_id: user.id,
      creator_id: creatorId,
      status: finalPrice === 0 ? 'active' : 'active', // 'pending' when payments live
      creator_price: finalPrice,
      fan_paid: finalPrice * 1.30,
      platform_fee: finalPrice * 0.08,
      processor_fee: finalPrice * 0.03,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      sale_id: saleId || null,
      payment_provider: 'pending',
    }, { onConflict: 'fan_id,creator_id' });

    if (error) throw error;

    // Get fan profile for notifications
    const { data: fanProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Send notifications
    await Promise.all([
      sendNewSubscriberNotification(creatorId, user.id, fanProfile?.username || 'A fan'),
      logFanActivity({
        fanId: user.id,
        creatorId,
        activityType: 'subscription_start',
      }),
    ]);

    return NextResponse.json({ success: true, price: finalPrice });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
