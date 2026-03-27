import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PAYMENT WEBHOOK STUB
 * Wire to North/CCBill when payment provider is connected
 * This endpoint receives payment events and updates our DB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';

    // TODO: Verify webhook signature from payment provider
    // const expectedSig = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET!).update(body).digest('hex');
    // if (signature !== expectedSig) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const event = JSON.parse(body);

    switch (event.type) {
      case 'subscription.activated':
        await supabase.from('subscriptions').update({
          status: 'active',
          payment_provider_id: event.subscriptionId,
          payment_provider: event.provider,
        }).eq('id', event.metadata.subscriptionId);
        break;

      case 'subscription.cancelled':
        await supabase.from('subscriptions').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }).eq('payment_provider_id', event.subscriptionId);
        break;

      case 'subscription.renewed':
        await supabase.from('subscriptions').update({
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        }).eq('payment_provider_id', event.subscriptionId);
        break;

      case 'ppv.purchased':
        await supabase.from('ppv_purchases').update({
          status: 'completed',
          payment_intent_id: event.transactionId,
          payment_provider: event.provider,
        }).eq('id', event.metadata.purchaseId);
        break;

      case 'chargeback.created':
        // Handle chargeback — flag the subscription/purchase
        await supabase.from('subscriptions').update({
          status: 'refunded',
        }).eq('payment_provider_id', event.subscriptionId);
        break;

      default:
        console.log('Unhandled payment event:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Payment webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
