'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface Props {
  fanId: string;
  children: React.ReactNode;
}

interface FanData {
  username: string;
  avatar_url: string | null;
  created_at: string;
  isSubscribed: boolean;
  ppvPurchases: number;
  profileViews: number;
  totalSpent: number;
  topCategories: string[];
  lastActive: string | null;
}

export default function FanDataPopup({ fanId, children }: Props) {
  const { profile } = useAuth();
  const router = useRouter();
  const [fanData, setFanData] = useState<FanData | null>(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const triggerTimer = useRef<NodeJS.Timeout>();
  const hideTimer = useRef<NodeJS.Timeout>();

  if (profile?.role !== 'creator') return <>{children}</>;
  if (fanId === profile?.id) return <>{children}</>;

  const fetchFanData = async () => {
    if (fanData || loading) return;
    setLoading(true);
    const [
      { data: fanProfile },
      { data: subscription },
      { data: purchases },
      { data: activity },
      { data: blockData },
    ] = await Promise.all([
      supabase.from('profiles').select('username, avatar_url, created_at').eq('id', fanId).single(),
      supabase.from('subscriptions').select('started_at').eq('fan_id', fanId).eq('creator_id', profile!.id).eq('status', 'active').maybeSingle(),
      supabase.from('ppv_purchases').select('amount').eq('fan_id', fanId).eq('creator_id', profile!.id).eq('status', 'completed'),
      supabase.from('fan_activity').select('activity_type, created_at').eq('fan_id', fanId).eq('creator_id', profile!.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('blocked_users').select('id').eq('blocker_id', profile!.id).eq('blocked_id', fanId).maybeSingle(),
    ]);

    setIsBlocked(!!blockData);
    const totalSpent = (purchases || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const profileViews = (activity || []).filter((a: any) => a.activity_type === 'profile_view').length;

    setFanData({
      username: fanProfile?.username || 'Unknown',
      avatar_url: fanProfile?.avatar_url || null,
      created_at: fanProfile?.created_at || '',
      isSubscribed: !!subscription,
      ppvPurchases: purchases?.length || 0,
      profileViews,
      totalSpent,
      topCategories: ['feet', 'natural'],
      lastActive: activity?.[0]?.created_at || null,
    });
    setLoading(false);
  };

  const handleMouseEnterTrigger = () => {
    clearTimeout(hideTimer.current);
    triggerTimer.current = setTimeout(() => { setShow(true); fetchFanData(); }, 500);
  };

  const handleMouseLeaveTrigger = () => {
    clearTimeout(triggerTimer.current);
    hideTimer.current = setTimeout(() => setShow(false), 200);
  };

  const handleMouseEnterPopup = () => clearTimeout(hideTimer.current);
  const handleMouseLeavePopup = () => { hideTimer.current = setTimeout(() => setShow(false), 200); };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const popupStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #1A1200 0%, #2A1500 50%, #1A0800 100%)',
    border: '1px solid #FF6B00',
    boxShadow: '0 0 30px rgba(255,107,0,0.25), 0 20px 60px rgba(0,0,0,0.9)',
    minWidth: 240,
  };

  return (
    <div className="relative inline-block">
      <div onMouseEnter={handleMouseEnterTrigger} onMouseLeave={handleMouseLeaveTrigger}>
        {children}
      </div>

      {show && (
        <div
          onMouseEnter={handleMouseEnterPopup}
          onMouseLeave={handleMouseLeavePopup}
          className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl z-[999] p-4 animate-fade-in"
          style={popupStyle}
        >
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-hf-orange/30 border-t-hf-orange rounded-full animate-spin" />
            </div>
          ) : fanData ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-full bg-gradient-hf overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-hf-orange transition-all"
                    onClick={() => { setShow(false); router.push('/user/' + fanData.username); }}
                  >
                    {fanData.avatar_url
                      ? <img src={fanData.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{fanData.username[0].toUpperCase()}</div>}
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm text-white cursor-pointer hover:text-hf-orange transition-colors"
                      onClick={() => { setShow(false); router.push('/user/' + fanData.username); }}
                    >
                      @{fanData.username}
                    </p>
                    <p className="text-[10px] text-hf-muted font-mono">
                      Since {new Date(fanData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {fanData.isSubscribed ? (
                  <span className="text-xs bg-green-400/15 text-green-400 border border-green-400/30 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
                    ✓ Subbed
                  </span>
                ) : (
                  <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
                    Not subbed
                  </span>
                )}
              </div>

              {/* Spend */}
              <div className="rounded-xl p-2.5 mb-3" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <p className="text-xs text-white/80 leading-relaxed">
                  <span className="text-hf-orange font-semibold">@{fanData.username}</span> has spent{' '}
                  <span className="text-green-400 font-bold">${fanData.totalSpent.toFixed(2)}</span> with you
                  {fanData.ppvPurchases > 0 && <span className="text-white/50"> · {fanData.ppvPurchases} PPV</span>}
                </p>
              </div>

              {/* Turn-ons */}
              {fanData.topCategories.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-bold text-white mb-2">
                    <span className="text-hf-orange">@{fanData.username}</span>'s turn-ons are
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {fanData.topCategories.map(cat => (
                      <span key={cat} className="text-sm bg-hf-orange/20 text-hf-orange px-3 py-1 rounded-full font-semibold capitalize border border-hf-orange/30">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile views */}
              {fanData.profileViews > 0 && (
                <p className="text-[11px] text-white/50 mb-3">
                  👀 Visited your profile <span className="text-white font-semibold">{fanData.profileViews}x</span>
                  {fanData.lastActive && <span> · {timeAgo(fanData.lastActive)}</span>}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShow(false); router.push('/messages?dm=' + fanData.username); }}
                  className="flex-1 py-1.5 text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #CC2400, #FF6B00)' }}
                >
                  💬 DM
                </button>
                <button
                  disabled={blockLoading}
                  onClick={async () => {
                    setBlockLoading(true);
                    if (isBlocked) {
                      await supabase.from('blocked_users').delete().eq('blocker_id', profile!.id).eq('blocked_id', fanId);
                      setIsBlocked(false);
                    } else {
                      await supabase.from('blocked_users').insert({ blocker_id: profile!.id, blocked_id: fanId });
                      setIsBlocked(true);
                    }
                    setBlockLoading(false);
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-mono rounded-lg transition-all border ${
                    isBlocked
                      ? 'bg-red-500/20 border-red-400 text-red-400'
                      : 'border-white/20 text-white/50 hover:border-red-400 hover:text-red-400'
                  }`}
                  style={{ background: isBlocked ? undefined : 'rgba(0,0,0,0.3)' }}
                >
                  {blockLoading ? '...' : isBlocked ? '🔓 Unblock' : '🚫 Block'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
