'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/lib/types';
import PostCard from '@/components/PostCard';

const supabase = createSupabaseBrowserClient();

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchPosts = useCallback(async () => {
    if (!user) return;

    // Get subscriptions to know which creators' subscriber posts to show
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('creator_id, creator_price, status')
      .eq('fan_id', user.id)
      .eq('status', 'active');

    const paidFollowing = (subs || [])
      .filter((s: any) => s.creator_price > 0)
      .map((s: any) => s.creator_id);

    // Get PPV purchases
    const { data: purchases } = await supabase
      .from('ppv_purchases')
      .select('post_id')
      .eq('fan_id', user.id)
      .eq('status', 'completed');
    const purchasedIds = (purchases || []).map((p: any) => p.post_id);

    // Fetch ALL free posts + ALL ppv posts + subscriber posts from subscribed creators
    // Free and PPV visible to everyone, subscriber posts only to subscribers
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Build visibility filter
    const conditions = [];

    // Always show free posts from everyone
    conditions.push(`visibility.eq.free`);

    // Always show PPV posts from everyone (locked but visible)
    conditions.push(`visibility.eq.ppv`);

    // Show subscriber posts only from paid subscriptions
    if (paidFollowing.length > 0) {
      conditions.push(`and(visibility.eq.subscribers,user_id.in.(${paidFollowing.join(',')}))`);
    }

    // Always show own posts
    conditions.push(`user_id.eq.${user.id}`);

    query = query.or(conditions.join(','));

    const { data: feedPosts, error } = await query;

    if (error) { console.error('Feed error:', error); setLoading(false); return; }

    // Get all user IDs to fetch profiles
    const userIds = Array.from(new Set((feedPosts || []).map((p: any) => p.user_id)));
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_verified_creator')
        .in('id', userIds as string[]);
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    }

    // Get likes
    const postIds = (feedPosts || []).map((p: any) => p.id);
    let likesMap: Record<string, { count: number; liked: boolean }> = {};
    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);
      (likes || []).forEach((like: any) => {
        if (!likesMap[like.post_id]) likesMap[like.post_id] = { count: 0, liked: false };
        likesMap[like.post_id].count++;
        if (like.user_id === user.id) likesMap[like.post_id].liked = true;
      });
    }

    const enriched = (feedPosts || []).map((post: any) => ({
      ...post,
      profile: profileMap[post.user_id] || null,
      likes_count: likesMap[post.id]?.count || 0,
      liked_by_me: likesMap[post.id]?.liked || false,
      is_purchased: purchasedIds.includes(post.id),
    })) as Post[];

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gradient">Feed</h1>
        <p className="text-hf-muted text-sm mt-1">Latest from creators on HotFans</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-hf-card border border-hf-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-hf-border animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded bg-hf-border animate-pulse" />
                  <div className="w-16 h-2 rounded bg-hf-border animate-pulse" />
                </div>
              </div>
              <div className="w-full h-48 rounded-xl bg-hf-border animate-pulse" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔥</div>
          <h2 className="font-display text-xl font-bold mb-2">Nothing here yet</h2>
          <p className="text-hf-muted text-sm">Follow some creators to see their content here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
