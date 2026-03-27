import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSignedUrls } from '@/lib/signed-urls';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params;

    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Verify user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (token) {
      await userClient.auth.setSession({ access_token: token, refresh_token: '' });
    }

    const { data: { user } } = await userClient.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get post
    const { data: post, error } = await supabase
      .from('posts')
      .select('id, user_id, visibility, media_urls, media_types')
      .eq('id', postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Free content — return as is
    if (post.visibility === 'free') {
      return NextResponse.json({ urls: post.media_urls || [] });
    }

    // Owner always has access
    if (post.user_id === user.id) {
      return NextResponse.json({ urls: post.media_urls || [] });
    }

    // Subscriber content
    if (post.visibility === 'subscribers') {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('fan_id', user.id)
        .eq('creator_id', post.user_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!sub) {
        return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
      }
    }

    // PPV content
    if (post.visibility === 'ppv') {
      const { data: purchase } = await supabase
        .from('ppv_purchases')
        .select('id')
        .eq('fan_id', user.id)
        .eq('post_id', postId)
        .eq('status', 'completed')
        .maybeSingle();

      if (!purchase) {
        return NextResponse.json({ error: 'Purchase required' }, { status: 403 });
      }
    }

    // Generate signed URLs
    const signedUrls = await generateSignedUrls(post.media_urls || []);
    return NextResponse.json({ urls: signedUrls });

  } catch (err) {
    console.error('Content access error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
