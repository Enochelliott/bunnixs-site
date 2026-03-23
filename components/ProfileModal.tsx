'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Profile, calculateFanPrice } from '@/lib/types';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

interface ProfileModalProps {
  username: string;
  onClose: () => void;
}

export default function ProfileModal({ username, onClose }: ProfileModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('[ProfileModal] looking up username:', JSON.stringify(username));
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (data) {
        setCreator(data as Profile);
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.id);
        setPostCount(count || 0);

        // Fetch recent free posts for preview
        const { data: posts } = await supabase
          .from('posts')
          .select('id, media_urls, media_types, content, visibility')
          .eq('user_id', data.id)
          .eq('visibility', 'free')
          .order('created_at', { ascending: false })
          .limit(6);
        setRecentPosts(posts || []);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  const goToProfile = () => {
    onClose();
    if (creator?.role === 'creator') {
      router.push(`/creator/${creator.username}`);
    } else {
      router.push(`/user/${creator?.username}`);
    }
  };

  const handleSubscribe = async () => {
    console.log('[subscribe] user:', user?.id, 'creator:', creator?.id, 'role:', creator?.role);
    if (isSubscribed) { toast('Already subscribed!'); return; }
    setSubscribing(true);
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
    } finally {
      setSubscribing(false);
    }
  };

  // Check subscription status
  useEffect(() => {
    if (!user || !creator) return;
    supabase
      .from('subscriptions')
      .select('id')
      .eq('fan_id', user.id)
      .eq('creator_id', creator.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => { if (data) setIsSubscribed(true); });
  }, [user, creator]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
        onClick={onClose}
      />

      {/* Comic bubble modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-bunni-card pointer-events-auto w-full max-w-sm shadow-2xl"
          data-profile-modal="true"
          style={{
            borderRadius: '24px',
            border: '2px solid rgba(255,45,138,0.4)',
            boxShadow: '0 0 0 1px rgba(155,48,255,0.2), 0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,45,138,0.15)',
            animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Comic tail */}
          <div style={{
            position: 'absolute',
            bottom: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '14px solid rgba(255,45,138,0.4)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -11,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '12px solid #1A1A2E',
          }} />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
            </div>
          ) : !creator ? (
            <div className="text-center py-16 px-6">
              <p className="text-bunni-muted">User not found</p>
            </div>
          ) : (
            <>
              {/* Cover */}
              <div className="relative h-28 rounded-t-[22px] overflow-hidden bg-gradient-to-br from-bunni-purple/40 to-bunni-pink/30">
                {creator.cover_url && (
                  <Image src={creator.cover_url} alt="" fill className="object-cover" sizes="384px" />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-bunni-card/80 to-transparent" />

                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-bunni-pink transition-all text-xs z-10 font-bold"
                >✕</button>

                {/* Avatar — overlapping cover */}
                <div className="absolute -bottom-7 left-5 w-14 h-14 rounded-2xl overflow-hidden bg-gradient-bunni shadow-xl"
                  style={{ border: '3px solid #1A1A2E' }}>
                  {creator.avatar_url ? (
                    <Image src={creator.avatar_url} alt={creator.username} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                      {creator.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pt-9 pb-5">
                {/* Name row */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="font-display text-lg font-bold leading-tight">
                        {creator.display_name || creator.username}
                      </h2>
                      {creator.is_verified_creator && (
                        <span className="text-[10px] bg-bunni-pink/15 text-bunni-pink border border-bunni-pink/20 px-1.5 py-0.5 rounded-full font-mono">✓</span>
                      )}
                      {creator.role === 'creator' && (
                        <span className="text-[10px] bg-bunni-purple/15 text-bunni-purple border border-bunni-purple/20 px-1.5 py-0.5 rounded-full font-mono">👑</span>
                      )}
                    </div>
                    <p className="text-bunni-muted text-xs font-mono">@{creator.username}</p>
                  </div>

                  {/* Subscribe / Follow button */}
                  {creator.role === 'creator' && (
                    <button
                      onClick={() => { console.log('[btn] isSubscribed:', isSubscribed, 'subscribing:', subscribing, 'user:', user?.id); handleSubscribe(); }}
                      disabled={isSubscribed || subscribing}
                      className="px-3 py-1.5 bg-gradient-bunni text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all flex-shrink-0 shadow-lg"
                    >
                      {isSubscribed ? '✓ Subscribed' : subscribing ? 'Subscribing...' : creator.subscription_price
                        ? `⭐ $${calculateFanPrice(creator.subscription_price).toFixed(2)}/mo`
                        : '+ Follow'}
                    </button>
                  )}
                </div>

                {/* Bio */}
                {creator.bio && (
                  <p className="text-xs text-bunni-text/70 leading-relaxed mb-3 line-clamp-2">{creator.bio}</p>
                )}

                {/* Stats row */}
                <div className="flex gap-4 py-2.5 px-3 bg-bunni-dark/50 rounded-xl mb-3">
                  <div className="text-center flex-1">
                    <p className="font-display font-bold text-bunni-pink text-sm">{postCount}</p>
                    <p className="text-[10px] text-bunni-muted font-mono">posts</p>
                  </div>
                  {creator.subscription_price && (
                    <div className="text-center flex-1 border-x border-bunni-border">
                      <p className="font-display font-bold text-bunni-lime text-sm">
                        ${calculateFanPrice(creator.subscription_price).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-bunni-muted font-mono">per mo</p>
                    </div>
                  )}
                  <div className="text-center flex-1">
                    <p className="font-display font-bold text-bunni-purple text-sm">
                      {new Date(creator.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-bunni-muted font-mono">joined</p>
                  </div>
                </div>

                {/* Media preview grid */}
                {recentPosts.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 mb-3 rounded-xl overflow-hidden">
                    {recentPosts.slice(0, 3).map((post, i) => (
                      <div key={i} className="relative aspect-square bg-bunni-dark">
                        {post.media_urls?.[0] ? (
                          post.media_types?.[0] === 'image' ? (
                            <Image src={post.media_urls[0]} alt="" fill className="object-cover" sizes="120px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-bunni-border">
                              <span className="text-2xl">🎬</span>
                            </div>
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <p className="text-[10px] text-bunni-muted text-center line-clamp-3">{post.content}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Categories */}
                {creator.content_categories && creator.content_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {creator.content_categories.slice(0, 4).map(cat => (
                      <span key={cat} className="text-[10px] bg-bunni-border text-bunni-muted px-2 py-0.5 rounded-full font-mono capitalize">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => goToProfile(e)}
                    className="flex-1 py-2.5 rounded-xl bg-bunni-dark border border-bunni-border text-xs font-semibold text-bunni-text hover:border-bunni-pink hover:text-bunni-pink transition-all"
                  >
                    View Full Profile →
                  </button>
                  {creator.role === 'creator' && (
                    <button
                      onClick={() => { toast('DMs coming soon!', { icon: '💬' }); }}
                      className="px-3 py-2.5 rounded-xl bg-bunni-dark border border-bunni-border text-xs font-semibold text-bunni-muted hover:border-bunni-cyan hover:text-bunni-cyan transition-all"
                    >
                      💬
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.85) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
