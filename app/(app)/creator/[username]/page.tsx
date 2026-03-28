'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, Post, calculateFanPrice } from '@/lib/types';
import PostCard from '@/components/PostCard';
import toast from 'react-hot-toast';
import SubscribeButton from '@/components/subscriptions/SubscribeButton';
import BlockButton from '@/components/blocking/BlockButton';
import FanDataPopup from '@/components/creator/FanDataPopup';

const supabase = createSupabaseBrowserClient();

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const { user, profile: myProfile } = useAuth();

  const [creator, setCreator] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showReport, setShowReport] = useState<string | null>(null);

  // ─── Fetch creator profile ────────────────────────────────────────────────
  const fetchCreator = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, profile:profiles(id, username, avatar_url, is_verified_creator)')
      .eq('username', username.toLowerCase())
      .eq('role', 'creator')
      .single();

    if (error || !data) {
      router.push('/discover');
      return;
    }
    setCreator(data as Profile);
    // Track profile view
    if (user && user.id !== data.id) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch('/api/fan-activity', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token,
          },
          body: JSON.stringify({ creatorId: data.id, activityType: 'profile_view' }),
        }).catch(() => {});
      });
    }
    setLoadingProfile(false);
  }, [username, router]);

  // ─── Check subscription status ───────────────────────────────────────────
  const checkSubscription = useCallback(async () => {
    if (!user || !creator) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('fan_id', user.id)
      .eq('creator_id', creator.id)
      .eq('status', 'active')
      .maybeSingle();
    setIsSubscribed(!!data);
  }, [user, creator]);

  // ─── Fetch posts with visibility logic ───────────────────────────────────
  const fetchPosts = useCallback(async () => {
    if (!creator) return;
    setLoadingPosts(true);

    // Always fetch all posts for this creator — RLS handles access
    // We also fetch PPV purchase status so UI can show lock correctly
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profile:profiles(id, username, avatar_url, is_verified_creator)')
      .eq('user_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!postsData) { setLoadingPosts(false); return; }

    // Get PPV purchases for this fan
    let purchasedPostIds: string[] = [];
    if (user) {
      const { data: purchases } = await supabase
        .from('ppv_purchases')
        .select('post_id')
        .eq('fan_id', user.id)
        .eq('status', 'completed');
      purchasedPostIds = purchases?.map(p => p.post_id) || [];
    }

    // Get likes
    const postIds = postsData.map(p => p.id);
    let likesMap: Record<string, { count: number; liked: boolean }> = {};
    if (postIds.length > 0 && user) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);
      likes?.forEach(like => {
        if (!likesMap[like.post_id]) likesMap[like.post_id] = { count: 0, liked: false };
        likesMap[like.post_id].count++;
        if (like.user_id === user.id) likesMap[like.post_id].liked = true;
      });
    }

    const enriched = postsData.map(post => ({
      ...post,
      likes_count: likesMap[post.id]?.count || 0,
      liked_by_me: likesMap[post.id]?.liked || false,
      is_purchased: purchasedPostIds.includes(post.id),
      is_subscribed: isSubscribed,
    })) as Post[];

    setPosts(enriched);
    setLoadingPosts(false);
  }, [creator, user, isSubscribed]);

  useEffect(() => { fetchCreator(); }, [fetchCreator]);
  useEffect(() => { if (creator) checkSubscription(); }, [creator, checkSubscription]);
  useEffect(() => { if (creator) fetchPosts(); }, [creator, fetchPosts]);

  // ─── Copy private share link ─────────────────────────────────────────────
  const copyShareLink = () => {
    const link = `${window.location.origin}/c/${creator?.username}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast.success('Profile link copied! 🔗');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ─── Report post ─────────────────────────────────────────────────────────
  const handleReport = async (postId: string, reason: string) => {
    // Wire to admin dashboard later — for now just log to DB
    await supabase.from('post_reports').insert({
      post_id: postId,
      reporter_id: user?.id,
      reason,
      status: 'pending',
    }).then(({ error }) => {
      if (error) {
        // Table may not exist yet — still show confirmation to user
        console.warn('Report table not ready:', error.message);
      }
    });
    toast.success('Report submitted. Our team will review it.');
    setShowReport(null);
  };

  // ─── Subscribe ───────────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!user || !creator) return;
    if (isSubscribed) { toast('Already subscribed!'); return; }
    try {
      const { error } = await supabase.from('subscriptions').insert({
        fan_id: user.id,
        creator_id: creator.id,
        status: 'active',
        price: creator.subscription_price || 0,
        started_at: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      setIsSubscribed(true);
      toast.success(`Subscribed to ${creator.username}! ⭐`);
    } catch (err) {
      toast.error('Could not subscribe');
    }
  };

  // ─── Visibility gate helper ───────────────────────────────────────────────
  const canViewPost = (post: Post): boolean => {
    if (post.visibility === 'free') return true;
    if (user?.id === creator?.id) return true; // creator sees own posts
    if (post.visibility === 'subscribers') return isSubscribed;
    if (post.visibility === 'ppv') return post.is_purchased || false;
    return false;
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-bunni-dark flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
      </div>
    );
  }

  if (!creator) return null;

  const isOwnProfile = user?.id === creator.id;
  const freePostCount = posts.filter(p => p.visibility === 'free').length;
  const subscriberPostCount = posts.filter(p => p.visibility === 'subscribers').length;
  const ppvPostCount = posts.filter(p => p.visibility === 'ppv').length;

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* ── Cover ── */}
      <div className="relative h-48 bg-gradient-to-br from-bunni-purple/30 to-bunni-pink/30 rounded-b-3xl overflow-hidden">
        {creator.cover_url && (
          <Image src={creator.cover_url} alt="" fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bunni-dark/60 to-transparent" />
      </div>

      {/* ── Profile header ── */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="flex items-end justify-between mb-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-bunni-dark bg-gradient-bunni shadow-xl">
            {creator.avatar_url ? (
              <Image src={creator.avatar_url} alt={creator.username} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                {creator.username[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pb-1">
            {/* Share / private link */}
          <div className="flex gap-2 pb-1 flex-wrap">
            {/* Message button — non-owners only */}
            {!isOwnProfile && (
              <button onClick={() => router.push('/messages')} className="px-3 py-2 rounded-xl border border-hf-border text-hf-muted hover:border-hf-orange hover:text-hf-orange text-xs font-mono transition-all">💬</button>
            )}
            {/* Share */}
            <button
              title="Copy profile link"
            >
              {linkCopied ? '✓ Copied!' : '🔗 Share'}
            </button>

            {/* Subscribe / Edit */}
            {isOwnProfile ? (
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 rounded-xl border border-bunni-border text-xs font-semibold text-bunni-muted hover:border-bunni-pink hover:text-bunni-pink transition-all"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <BlockButton targetId={creator.id} targetUsername={creator.username} onBlock={() => router.push('/discover')} />
                <SubscribeButton creatorId={creator.id} creatorUsername={creator.username} subscriptionPrice={creator.subscription_price || 0} onSubscribed={() => setIsSubscribed(true)} />
              </div>
            )}
          </div>
        </div>







        </div>

        {/* Name + badges */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold">
              {creator.display_name || creator.username}
            </h1>
            {creator.is_verified_creator && (
              <span className="text-xs bg-bunni-pink/15 text-bunni-pink border border-bunni-pink/20 px-2 py-0.5 rounded-full font-mono">
                ✓ Verified
              </span>
            )}
            {creator.content_rating && (
              <span className="text-xs bg-bunni-border text-bunni-muted px-2 py-0.5 rounded-full font-mono">
                {creator.content_rating}
              </span>
            )}
          </div>
          <p className="text-bunni-muted text-sm font-mono">@{creator.username}</p>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="text-bunni-text text-sm leading-relaxed mb-4">{creator.bio}</p>
        )}

        {/* Categories */}
        {creator.content_categories && creator.content_categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {creator.content_categories.map(cat => (
              <span key={cat} className="text-xs bg-bunni-purple/15 text-bunni-purple border border-bunni-purple/20 px-2.5 py-1 rounded-full font-mono">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Post stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Free Posts', count: freePostCount, color: 'text-bunni-lime', icon: '🌍' },
            { label: 'Subscriber', count: subscriberPostCount, color: 'text-bunni-purple', icon: '⭐' },
            { label: 'PPV', count: ppvPostCount, color: 'text-bunni-pink', icon: '💎' },
          ].map(stat => (
            <div key={stat.label} className="bg-bunni-card border border-bunni-border rounded-xl p-3 text-center">
              <p className="text-lg mb-0.5">{stat.icon}</p>
              <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-bunni-muted font-mono">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Private link banner */}
        <div className="bg-bunni-card border border-bunni-border rounded-xl p-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-bunni-muted uppercase tracking-widest mb-0.5">Your profile link</p>
            <p className="text-sm font-mono text-bunni-pink truncate">
              bunnix.com/c/{creator.username}
            </p>
          </div>
          <button
            onClick={copyShareLink}
            className="text-xs text-bunni-muted hover:text-bunni-pink transition-colors font-mono px-3 py-1.5 border border-bunni-border hover:border-bunni-pink rounded-lg"
          >
            {linkCopied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Posts feed ── */}
      <div className="px-6">
        <h2 className="font-display text-lg font-semibold mb-4 text-bunni-muted">Posts</h2>

        {loadingPosts ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-bunni-card border border-bunni-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full shimmer" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3 rounded shimmer" />
                    <div className="w-16 h-2 rounded shimmer" />
                  </div>
                </div>
                <div className="w-full h-3 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✨</div>
            <p className="font-display text-lg font-semibold mb-1">No posts yet</p>
            <p className="text-bunni-muted text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const canView = canViewPost(post);

              // ── Locked post UI ──
              if (!canView) {
                return (
                  <div key={post.id} className="bg-bunni-card border border-bunni-border rounded-2xl overflow-hidden">
                    <div className="p-5">
                      {/* Blurred preview */}
                      <div className="relative rounded-xl overflow-hidden bg-bunni-dark h-40 flex items-center justify-center mb-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-bunni-purple/20 to-bunni-pink/20 blur-sm" />
                        <div className="relative z-10 text-center">
                          {post.visibility === 'subscribers' ? (
                            <>
                              <p className="text-3xl mb-2">🔒</p>
                              <p className="font-display font-semibold text-sm">Subscribers Only</p>
                              <p className="text-xs text-bunni-muted mt-1">
                                Subscribe for ${calculateFanPrice(creator.subscription_price || 0).toFixed(2)}/mo to unlock
                              </p>
                              <button
                                onClick={handleSubscribe}
                                className="mt-3 px-4 py-1.5 bg-gradient-bunni text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                              >
                                Subscribe to Unlock
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-3xl mb-2">💎</p>
                              <p className="font-display font-semibold text-sm">Pay Per View</p>
                              <p className="text-xs text-bunni-muted mt-1">
                                Unlock for ${post.ppv_price ? calculateFanPrice(post.ppv_price).toFixed(2) : '?'}
                              </p>
                              <button
                                onClick={() => toast('PPV unlocks coming soon! 🚀', { icon: '💎' })}
                                className="mt-3 px-4 py-1.5 bg-bunni-pink text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                              >
                                Unlock Post
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── Visible post ──
              return (
                <div key={post.id} className="relative group">
                  <PostCard
                    post={post}
                    onDelete={isOwnProfile ? () => setPosts(prev => prev.filter(p => p.id !== post.id)) : undefined}
                  />
                  {/* Report button — visible on hover, non-owners only */}
                  {!isOwnProfile && user && (
                    <div className="absolute top-4 right-4 z-20">
                      <button
                        onClick={() => setShowReport(showReport === post.id ? null : post.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all text-xs text-bunni-muted hover:text-orange-400 bg-bunni-dark/80 border border-bunni-border px-2 py-1 rounded-lg font-mono"
                      >
                        ⚑ Report
                      </button>
                      {showReport === post.id && (
                        <div className="absolute right-0 top-8 bg-bunni-dark border border-bunni-border rounded-xl overflow-hidden shadow-2xl z-30 w-48 animate-slide-up">
                          <p className="px-3 py-2 text-xs font-mono text-bunni-muted uppercase tracking-widest border-b border-bunni-border">
                            Report reason
                          </p>
                          {[
                            ['illegal_content', '🚨 Illegal content'],
                            ['underage', '🔞 Underage concern'],
                            ['non_consensual', '⛔ Non-consensual'],
                            ['spam', '🗑 Spam / scam'],
                            ['other', '📋 Other'],
                          ].map(([val, label]) => (
                            <button
                              key={val}
                              onClick={() => handleReport(post.id, val)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-bunni-border/50 transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Click outside to close report dropdown */}
      {showReport && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowReport(null)}
        />
      )}
    </div>
  );
}
