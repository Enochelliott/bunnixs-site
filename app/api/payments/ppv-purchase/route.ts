import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSignedUrls } from '@/lib/signed-urls';
import { logFanActivity } from '@/lib/fan-activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PAYMENT STUB — Wire to North/CCBill when ready
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId } = await request.json();

    // Get post
    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id, ppv_price, media_urls, visibility')
      .eq('id', postId)
      .single();

    if (!post || post.visibility !== 'ppv') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if already purchased
    const { data: existing } = await supabase
      .from('ppv_purchases')
      .select('id')
      .eq('fan_id', user.id)
      .eq('post_id', postId)
      .eq('status', 'completed')
      .maybeSingle();

    if (existing) {
      const signedUrls = await generateSignedUrls(post.media_urls || []);
      return NextResponse.json({ success: true, alreadyPurchased: true, urls: signedUrls });
    }

    // TODO: Replace with North payment API call
    // const paymentIntent = await northClient.createCharge({ amount: post.ppv_price * 130 });

    const price = post.ppv_price || 0;

    // Save purchase
    const { error } = await supabase.from('ppv_purchases').upsert({
      fan_id: user.id,
      post_id: postId,
      creator_id: post.user_id,
      amount: price,
      creator_price: price,
      fan_paid: price * 1.30,
      platform_fee: price * 0.08,
      processor_fee: price * 0.03,
      status: 'completed',
      payment_provider: 'pending',
    }, { onConflict: 'fan_id,post_id' });

    if (error) throw error;

    // Log activity
    await logFanActivity({
      fanId: user.id,
      creatorId: post.user_id,
      activityType: 'ppv_purchase',
      targetId: postId,
      targetType: 'post',
    });

    // Return signed URLs
    const signedUrls = await generateSignedUrls(post.media_urls || []);
    return NextResponse.json({ success: true, urls: signedUrls });

  } catch (err) {
    console.error('PPV purchase error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
