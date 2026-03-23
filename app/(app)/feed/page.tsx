'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/lib/types';
import PostComposer from '@/components/PostComposer';
import PostCard from '@/components/PostCard';

const supabase = createSupabaseBrowserClient();

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // 1. Get all creators the user is subscribed to (active subs)
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('fan_id', user.id)
      .eq('status', 'active');

    const subscribedTo = (subs || []).map((s: any) => s.creator_id);

    // 2. Get all creators the user follows for free (any subscription row, even free)
    // For now, treat any active subscription as "following"
    // Free follows = subscriptions where creator_price = 0
    const { data: freeSubs } = await supabase
      .from('subscriptions')
      .select('creator_id, creator_price')
      .eq('fan_id', user.id)
      .eq('status', 'active');

    const freeFollowing = (freeSubs || [])
      .filter((s: any) => !s.creator_price || s.creator_price === 0)
      .map((s: any) => s.creator_id);

    const paidFollowing = (freeSubs || [])
      .filter((s: any) => s.creator_price > 0)
      .map((s: any) => s.creator_id);

    // 3. Build list of all creator IDs we follow
    const allFollowing = [...new Set([...freeFollowing, ...paidFollowing])];

    if (allFollowing.length === 0) {
      // No subscriptions — show own posts only
      const { data: ownPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setPosts((ownPosts || []) as Post[]);
      setLoading(false);
      return;
    }

    // 4. Fetch posts from followed creators with visibility rules:
    //    - free posts from anyone we follow
    //    - subscribers posts only from paid subscribers
    //    - always include own posts
    const { data: feedPosts, error } = await supabase
      .from('posts')
      .select('*')
      .or(
        [
          // Own posts — all visibility
          `user_id.eq.${user.id}`,
          // Free posts from anyone we follow
          allFollowing.length > 0
            ? `and(user_id.in.(${allFollowing.join(',')}),visibility.eq.free)`
            : null,
          // Subscribers-only posts from paid subs
          paidFollowing.length > 0
            ? `and(user_id.in.(${paidFollowing.join(',')}),visibility.eq.subscribers)`
            : null,
        ]
          .filter(Boolean)
          .join(',')
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Feed error:', error);
      setLoading(false);
      return;
    }

    // 5. Enrich with likes
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

    // 6. Enrich with profile info
    const userIds = [...new Set((feedPosts || []).map((p: any) => p.user_id))];
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    }

    const enriched = (feedPosts || []).map((post: any) => ({
      ...post,
      profile: profileMap[post.user_id] || null,
      likes_count: likesMap[post.id]?.count || 0,
      liked_by_me: likesMap[post.id]?.liked || false,
    })) as Post[];

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient">Your Feed</span>
          {profile?.username && (
            <span className="text-bunni-text">, @{profile.username}</span>
          )}
        </h1>
        <p className="text-bunni-muted text-sm mt-1">Posts from creators you follow.</p>
      </div>

      {profile?.role === 'creator' && (
        <div className="mb-6">
          <PostComposer onPost={fetchPosts} />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bunni-card border border-bunni-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded shimmer" />
                  <div className="w-16 h-2 rounded shimmer" />
                </div>
              </div>
              <div className="w-full h-3 rounded shimmer" />
              <div className="w-3/4 h-3 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🐰</div>
          <h3 className="font-display text-xl font-semibold mb-2">Nothing here yet</h3>
          <p className="text-bunni-muted text-sm">
            Subscribe to creators to see their posts here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={post.user_id === user?.id ? () => setPosts(prev => prev.filter(p => p.id !== post.id)) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
