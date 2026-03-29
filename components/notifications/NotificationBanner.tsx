'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface Banner {
  id: string;
  title: string;
  body: string | null;
  type: string;
  target_id: string | null;
  target_type: string | null;
  created_at: string;
}

export default function NotificationBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Poll every 5 seconds for new message notifications from Stream
    const checkMessages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/unread-count', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.count > 0 && data.latestMessage) {
            const msgBannerId = 'msg-' + data.latestMessage.id;
            if (!seenIds.current.has(msgBannerId)) {
              seenIds.current.add(msgBannerId);
              const msgBanner: Banner = {
                id: msgBannerId,
                title: '💬 New message from @' + data.latestMessage.from,
                body: data.latestMessage.text || 'Sent you a message',
                type: 'message',
                target_id: null,
                target_type: null,
                created_at: new Date().toISOString(),
              };
              setBanners(prev => [...prev, msgBanner]);
              setTimeout(() => setBanners(prev => prev.filter(b => b.id !== msgBannerId)), 8000);
            }
          }
        }
      } catch {}
    };

    checkMessages();
    const msgInterval = setInterval(checkMessages, 10000);

    // Poll every 5 seconds for new unread notifications
    const checkNew = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!data) return;
      const newOnes = data.filter(n => !seenIds.current.has(n.id));
      if (!newOnes.length) return;

      newOnes.forEach(n => seenIds.current.add(n.id));
      setBanners(prev => [...prev, ...newOnes]);

      // Auto-dismiss each after 8 seconds
      newOnes.forEach(n => {
        setTimeout(() => {
          setBanners(prev => prev.filter(b => b.id !== n.id));
        }, 8000);
      });
    };

    checkNew();
    const interval = setInterval(checkNew, 5000);

    // Also try Supabase Realtime
    const channel = supabase
      .channel('notification-banners-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as Banner;
        if (seenIds.current.has(n.id)) return;
        seenIds.current.add(n.id);
        setBanners(prev => [...prev, n]);
        setTimeout(() => setBanners(prev => prev.filter(b => b.id !== n.id)), 8000);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      clearInterval(msgInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismiss = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const handleClick = (banner: Banner) => {
    dismiss(banner.id);
    supabase.from('notifications').update({ read: true }).eq('id', banner.id);
    if (banner.type === 'new_subscriber' || banner.type === 'ppv_unlocked' || banner.type === 'subscription_cancel') {
      router.push('/creator/dashboard');
    } else if (banner.type === 'message') {
      router.push('/messages');
    } else if (banner.target_id && banner.target_type === 'post') {
      // Navigate to feed and scroll to post
      router.push('/feed');
      setTimeout(() => {
        const el = document.getElementById('post-' + banner.target_id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
    } else {
      router.push('/creator/dashboard');
    }
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      like: '❤️', comment: '💬', new_subscriber: '🔥',
      ppv_unlocked: '💰', profile_view: '👀',
      ppv_view_no_purchase: '💎', subscription_cancel: '😢',
      review: '⭐', sale_started: '🔥', message: '💬',
      subscriber_view_no_sub: '⭐', reaction: '🔥',
    };
    return icons[type] || '🔔';
  };

  if (!banners.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {banners.map(banner => (
        <div
          key={banner.id}
          onClick={() => handleClick(banner)}
          className="pointer-events-auto cursor-pointer rounded-2xl p-4 shadow-2xl animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, #CC2400 0%, #FF6B00 100%)',
            border: '1px solid rgba(255,107,0,0.5)',
            boxShadow: '0 0 20px rgba(204,36,0,0.4), 0 10px 40px rgba(0,0,0,0.6)',
            animation: 'notification-slide 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{getIcon(banner.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">{banner.title}</p>
              {banner.body && <p className="text-xs text-white/80 mt-0.5 line-clamp-2">{banner.body}</p>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); dismiss(banner.id); }}
              className="text-white/60 hover:text-white text-lg leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
