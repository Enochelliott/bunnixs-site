'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Profile, calculateFanPrice } from '@/lib/types';
import toast from 'react-hot-toast';
import BlockButton from './blocking/BlockButton';
import SubscribeButton from './subscriptions/SubscribeButton';

const supabase = createSupabaseBrowserClient();

interface ProfileModalProps {
  username: string;
  onClose: () => void;
}

export default function ProfileModal({ username, onClose }: ProfileModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!username) return;
    fetchCreator();
  }, [username]);

  const fetchCreator = async () => {
    console.log('[ProfileModal] looking up username:', username);
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !data) {
      console.error('[ProfileModal] not found:', error);
      setLoading(false);
      return;
    }

    setCreator(data as Profile);

    // Check subscription
    if (user) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('fan_id', user.id)
        .eq('creator_id', data.id)
        .eq('status', 'active')
        .maybeSingle();
      setIsSubscribed(!!sub);
    }

    // Fetch recent free posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', data.id)
      .eq('visibility', 'free')
      .order('created_at', { ascending: false })
      .limit(3);

    setPosts(postsData || []);
    setLoading(false);
  };

  const goToProfile = () => {
    if (!creator) return;
    onClose();
    if (creator.role === 'creator') {
      window.location.href = `/creator/${creator.username}`;
    } else {
      window.location.href = `/user/${creator.username}`;
    }
  };

  if (!creator && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        data-profile-modal="true"
        className="relative bg-bunni-card border border-bunni-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
          </div>
        ) : creator ? (
          <>
            {/* Cover */}
            <div className="relative h-24 bg-gradient-to-br from-bunni-purple/30 to-bunni-pink/30">
              {creator.cover_url && (
                <Image src={creator.cover_url} alt="" fill className="object-cover" />
              )}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-bunni-pink transition-all"
              >
                ✕
              </button>
            </div>

            {/* Avatar */}
            <div className="px-5 -mt-8 relative z-10 flex items-end justify-between mb-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-bunni-card bg-gradient-bunni shadow-xl">
                {creator.avatar_url ? (
                  <Image src={creator.avatar_url} alt={creator.username} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                    {creator.username[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {user?.id !== creator.id && (
                <div className="flex items-center gap-2 pb-1">
                  <BlockButton
                    targetId={creator.id}
                    targetUsername={creator.username}
                    onBlock={onClose}
                  />
                  {creator.role === 'creator' && (
                    <SubscribeButton
                      creatorId={creator.id}
                      creatorUsername={creator.username}
                      subscriptionPrice={creator.subscription_price || 0}
                      onSubscribed={() => setIsSubscribed(true)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-display text-lg font-bold">
                  {creator.display_name || creator.username}
                </h3>
                {creator.is_verified_creator && (
                  <span className="text-xs bg-bunni-pink/15 text-bunni-pink border border-bunni-pink/20 px-2 py-0.5 rounded-full font-mono">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-bunni-muted text-xs font-mono mb-2">@{creator.username}</p>

              {creator.bio && (
                <p className="text-bunni-text text-sm leading-relaxed mb-3 line-clamp-2">{creator.bio}</p>
              )}

              {/* Stats */}
              {creator.role === 'creator' && (
                <div className="flex gap-3 mb-4">
                  {creator.subscription_price ? (
                    <div className="bg-bunni-dark rounded-xl px-3 py-2 text-center flex-1">
                      <p className="font-display text-sm font-bold text-bunni-pink">
                        ${calculateFanPrice(creator.subscription_price).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-bunni-muted font-mono">per month</p>
                    </div>
                  ) : (
                    <div className="bg-bunni-dark rounded-xl px-3 py-2 text-center flex-1">
                      <p className="font-display text-sm font-bold text-bunni-lime">Free</p>
                      <p className="text-[10px] text-bunni-muted font-mono">to follow</p>
                    </div>
                  )}
                  {isSubscribed && (
                    <div className="bg-bunni-lime/10 border border-bunni-lime/30 rounded-xl px-3 py-2 text-center flex-1">
                      <p className="font-display text-sm font-bold text-bunni-lime">✓</p>
                      <p className="text-[10px] text-bunni-muted font-mono">subscribed</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recent posts preview */}
              {posts.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                  {posts.map(post => (
                    post.media_urls?.length > 0 ? (
                      <div key={post.id} className="aspect-square rounded-xl overflow-hidden bg-bunni-dark">
                        <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : null
                  ))}
                </div>
              )}

              {/* View full profile */}
              <button
                onClick={goToProfile}
                className="w-full py-2.5 bg-gradient-bunni text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all"
              >
                View Full Profile →
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-bunni-muted">User not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
