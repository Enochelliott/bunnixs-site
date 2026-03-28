'use client';
import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post, CreatorWallet } from '@/lib/types';
import PostComposer from '@/components/content/PostComposer';
import PostCard from '@/components/PostCard';
import toast from 'react-hot-toast';
import LaunchSale from '@/components/subscriptions/LaunchSale';

const supabase = createSupabaseBrowserClient();

export default function CreatorDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [wallet, setWallet] = useState<CreatorWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [postsRes, walletRes] = await Promise.all([
      supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    const posts = (postsRes.data || []).map((p: any) => ({ ...p, profile: { id: user?.id, username: profile?.username, avatar_url: profile?.avatar_url } }));
    setPosts(posts as Post[]);
    setWallet(walletRes.data as CreatorWallet | null);
    setLoading(false);
  }, [user, profile]);


  useEffect(() => { fetchData(); }, [fetchData]);
    <div className="max-w-2xl mx-auto py-8 px-6">
      {/* Verification Banner */}
      {!profile?.is_verified_creator && (
        <button
          onClick={async () => {
            const res = await fetch('/api/veriff/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ verificationType: 'creator', userId: user?.id }),
            });
            const data = await res.json();
            if (data.sessionUrl) window.location.href = data.sessionUrl;
            else toast.error('Could not start verification');
          }}
          className="w-full mb-6 p-4 bg-gradient-to-r from-hf-red/20 to-hf-orange/20 border border-hf-red/40 rounded-2xl flex items-center justify-between hover:border-hf-orange transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪪</span>
            <div className="text-left">
              <p className="font-bold text-sm text-hf-orange">Verify your identity to start earning!</p>
              <p className="text-xs text-hf-muted">Quick 60-second ID verification — required before posting</p>
            </div>
          </div>
          <span className="text-hf-orange group-hover:translate-x-1 transition-transform">→</span>
        </button>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient">Creator Studio</span>
        </h1>
        <p className="text-hf-muted text-sm mt-1">@{profile?.username} — manage your content and earnings</p>
      </div>

      {/* Wallet stats */}
      {wallet && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Pending', value: wallet.pending_balance, color: 'text-yellow-400', icon: '⏳' },
            { label: 'Available', value: wallet.available_balance, color: 'text-green-400', icon: '💰' },
            { label: 'Total Earned', value: wallet.total_earned, color: 'text-hf-orange', icon: '📈' },
          ].map(stat => (
            <div key={stat.label} className="bg-hf-card border border-hf-border rounded-2xl p-4 text-center">
              <p className="text-xl mb-1">{stat.icon}</p>
              <p className={`font-display text-xl font-bold ${stat.color}`}>${stat.value.toFixed(2)}</p>
              <p className="text-xs text-hf-muted font-mono mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Subscription info */}
      {profile?.subscription_price && (
        <div className="bg-hf-card border border-hf-border rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Your subscription</p>
            <p className="text-xs text-hf-muted mt-0.5">Fans pay ${(profile.subscription_price * 1.30).toFixed(2)}/mo — you receive ${profile.subscription_price.toFixed(2)}/mo</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold text-hf-orange">${profile.subscription_price.toFixed(2)}</p>
            <p className="text-xs text-hf-muted">per month</p>
          </div>
        </div>
      )}

      {/* Creator Tools Row */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <LaunchSale />
      </div>

      {/* Co-Creator Invite */}
      <div className="bg-hf-card border border-hf-orange/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold">Generate Co-Creator Invite Link</h3>
            <p className="text-[11px] text-hf-muted italic mt-0.5">Age & Identity Verification for Co-Creators</p>
          </div>
          <button
            onClick={async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/veriff/invite', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session?.access_token || '') },
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                if (data.inviteUrl) {
                  await navigator.clipboard.writeText(data.inviteUrl);
                  toast.success('Invite link copied! 🔗 Valid for 72 hours.');
                } else {
                  toast.error('Could not generate invite link');
                }
              } catch { toast.error('Could not generate invite link'); }
            }}
            className="bg-gradient-hf text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all whitespace-nowrap"
          >
            🔗 Generate Link
          </button>
        </div>
      </div>

      {/* Composer */}
      <div className="mb-6">
        <PostComposer onPost={fetchData} />
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-hf-card border border-hf-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-hf-border animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded bg-hf-border animate-pulse" />
                  <div className="w-16 h-2 rounded bg-hf-border animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔥</div>
          <p className="font-display text-lg font-semibold mb-1">No posts yet</p>
          <p className="text-hf-muted text-sm">Create your first post above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
