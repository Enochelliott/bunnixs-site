'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const supabase = createSupabaseBrowserClient();

interface Subscription {
  creator_id: string;
  creator_price: number;
  profile?: { username: string; avatar_url: string | null; display_name: string | null };
}

export default function SubscribedDropdown() {
  const { user } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSubscriptions = async () => {
    if (!user || loading) return;
    setLoading(true);

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('creator_id, creator_price')
      .eq('fan_id', user.id)
      .eq('status', 'active');

    if (!subs?.length) { setLoading(false); return; }

    const creatorIds = subs.map(s => s.creator_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, display_name')
      .in('id', creatorIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    setSubscriptions(subs.map(s => ({ ...s, profile: profileMap[s.creator_id] })));
    setLoading(false);
  };

  const handleToggle = () => {
    if (!open) fetchSubscriptions();
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 bg-bunni-card border border-bunni-border rounded-xl hover:border-bunni-pink transition-all text-sm"
      >
        <span>⭐</span>
        <span className="font-semibold text-xs">Following</span>
        <span className="text-bunni-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 bg-bunni-card border border-bunni-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-bunni-border">
            <h3 className="font-display font-bold text-sm">Following & Subscribed</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">⭐</p>
                <p className="text-bunni-muted text-sm">Not following anyone yet</p>
                <button
                  onClick={() => { router.push('/discover'); setOpen(false); }}
                  className="mt-3 px-4 py-1.5 bg-gradient-bunni text-white text-xs font-bold rounded-xl"
                >
                  Discover Creators
                </button>
              </div>
            ) : (
              subscriptions.map(sub => (
                <button
                  key={sub.creator_id}
                  onClick={() => { router.push(`/creator/${sub.profile?.username}`); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bunni-dark transition-colors border-b border-bunni-border/50"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-bunni flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-white">
                    {sub.profile?.avatar_url
                      ? <img src={sub.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : sub.profile?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{sub.profile?.display_name || sub.profile?.username}</p>
                    <p className="text-xs text-bunni-muted font-mono">@{sub.profile?.username}</p>
                  </div>
                  <span className="text-xs font-mono text-bunni-pink flex-shrink-0">
                    {sub.creator_price > 0 ? `$${sub.creator_price}/mo` : 'Free'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
