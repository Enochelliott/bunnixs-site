'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const supabase = createSupabaseBrowserClient();

interface Purchase {
  id: string;
  post_id: string;
  amount: number;
  created_at: string;
  post: {
    id: string;
    content: string | null;
    media_urls: string[];
    media_types: string[];
    clip_start: number | null;
    clip_duration: number | null;
    profile: { username: string; avatar_url: string | null };
  } | null;
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    fetchPurchases();
  }, [user]);

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('ppv_purchases')
      .select(`
        id, post_id, amount, created_at,
        post:posts(id, content, media_urls, media_types, clip_start, clip_duration,
          profile:profiles!posts_user_id_fkey(username, avatar_url))
      `)
      .eq('fan_id', user!.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    setPurchases((data || []) as unknown as Purchase[]);
    setLoading(false);
  };

  const getSignedUrls = async (postId: string, mediaUrls: string[]) => {
    if (signedUrls[postId]) { setActivePost(postId); return; }
    // For now use public URLs — in production these would be signed with expiry
    // TODO: Generate signed URLs server-side with 1hr expiry
    setSignedUrls(prev => ({ ...prev, [postId]: mediaUrls }));
    setActivePost(activePost === postId ? null : postId);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient">My Purchases</h1>
        <p className="text-hf-muted text-sm mt-1">Content you've unlocked</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-hf-card border border-hf-border rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-hf-border" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded bg-hf-border" />
                  <div className="w-16 h-2 rounded bg-hf-border" />
                </div>
              </div>
              <div className="w-full h-40 rounded-xl bg-hf-border" />
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">💎</p>
          <h2 className="font-display text-xl font-bold mb-2">No purchases yet</h2>
          <p className="text-hf-muted text-sm">Unlock PPV content from creators to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map(purchase => (
            <div key={purchase.id} className="bg-hf-card border border-hf-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-hf flex items-center justify-center overflow-hidden flex-shrink-0">
                    {purchase.post?.profile?.avatar_url ? (
                      <img src={purchase.post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {purchase.post?.profile?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">@{purchase.post?.profile?.username}</p>
                    <p className="text-xs text-hf-muted font-mono">
                      {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    💎 Unlocked · ${purchase.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Content text */}
              {purchase.post?.content && (
                <p className="px-5 pb-3 text-sm text-hf-text">{purchase.post.content}</p>
              )}

              {/* Media — tap to reveal */}
              {purchase.post && (
                <div>
                  {activePost === purchase.post_id && signedUrls[purchase.post_id] ? (
                    <div className="space-y-1">
                      {signedUrls[purchase.post_id].map((url, i) => (
                        purchase.post!.media_types?.[i] === 'image' ? (
                          <img key={i} src={url} alt="" className="w-full" />
                        ) : (
                          <video key={i} src={url} controls className="w-full" controlsList="nodownload" />
                        )
                      ))}
                      <button
                        onClick={() => setActivePost(null)}
                        className="w-full py-2 text-xs text-hf-muted hover:text-hf-text border-t border-hf-border transition-colors"
                      >
                        ▲ Hide
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => getSignedUrls(purchase.post_id, purchase.post!.media_urls || [])}
                      className="w-full py-4 flex items-center justify-center gap-2 text-sm font-semibold border-t border-hf-border hover:bg-hf-border/30 transition-colors"
                      style={{ color: '#FF6B00' }}
                    >
                      🔥 View Your Content
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
