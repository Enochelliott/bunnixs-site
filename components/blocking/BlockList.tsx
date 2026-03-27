'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

export default function BlockList() {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBlocked();
  }, [user]);

  const fetchBlocked = async () => {
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('blocked_id, created_at')
      .eq('blocker_id', user!.id)
      .order('created_at', { ascending: false });

    if (!blocks?.length) { setBlocked([]); setLoading(false); return; }

    const ids = blocks.map(b => b.blocked_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    setBlocked(blocks.map(b => ({ ...b, profile: profileMap[b.blocked_id] })));
    setLoading(false);
  };

  const handleUnblock = async (blockedId: string, username: string) => {
    await supabase.from('blocked_users').delete()
      .eq('blocker_id', user!.id)
      .eq('blocked_id', blockedId);
    setBlocked(prev => prev.filter(b => b.blocked_id !== blockedId));
    toast.success(`Unblocked @${username}`);
  };

  if (loading) return <div className="text-bunni-muted text-sm">Loading...</div>;

  if (!blocked.length) return (
    <div className="text-center py-8">
      <p className="text-2xl mb-2">🚫</p>
      <p className="text-bunni-muted text-sm">No blocked users</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {blocked.map(b => (
        <div key={b.blocked_id} className="flex items-center justify-between bg-bunni-dark border border-bunni-border rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-bunni flex items-center justify-center text-sm font-bold text-white overflow-hidden">
              {b.profile?.avatar_url
                ? <img src={b.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : b.profile?.username?.[0]?.toUpperCase()}
            </div>
            <p className="text-sm font-semibold">@{b.profile?.username}</p>
          </div>
          <button
            onClick={() => handleUnblock(b.blocked_id, b.profile?.username)}
            className="text-xs text-bunni-muted hover:text-bunni-pink transition-colors font-mono"
          >
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
