import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSaleNotification } from '@/lib/notifications';

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

// Launch a sale
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { discountPercent, firstTimeOnly, isPublic, durationHours } = await request.json();

  // Verify creator
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') {
    return NextResponse.json({ error: 'Only creators can launch sales' }, { status: 403 });
  }

  const expiresAt = new Date(Date.now() + (durationHours || 48) * 60 * 60 * 1000).toISOString();

  // Create sale
  const { data: sale, error } = await supabase
    .from('creator_sales')
    .insert({
      creator_id: user.id,
      discount_percent: discountPercent,
      first_time_only: firstTimeOnly || false,
      is_public: isPublic || false,
      expires_at: expiresAt,
      status: 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If public — post to feed and notify subscribers
  if (isPublic) {
    // Create a feed post announcing the sale
    await supabase.from('posts').insert({
      user_id: user.id,
      content: `🔥 ${discountPercent}% OFF SALE! ${firstTimeOnly ? 'New subscribers only! ' : ''}Subscribe now before it expires! ⏰`,
      visibility: 'free',
      categories: ['sale'],
    });

    // Get all subscribers to notify
    const { data: subscribers } = await supabase
      .from('subscriptions')
      .select('fan_id')
      .eq('creator_id', user.id)
      .eq('status', 'active');

    const subscriberIds = (subscribers || []).map(s => s.fan_id);
    await sendSaleNotification(subscriberIds, profile.username, discountPercent, sale.id);
  }

  return NextResponse.json({ sale });
}

// Get active sales for a creator
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creatorId');

  if (!creatorId) return NextResponse.json({ sales: [] });

  const { data } = await supabase
    .from('creator_sales')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return NextResponse.json({ sales: data || [] });
}
