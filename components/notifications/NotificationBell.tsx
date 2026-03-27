'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  target_id: string | null;
  target_type: string | null;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    const channel = supabase
      .channel('notifications-bell-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20);
    setNotifications(data || []);
    setUnread((data || []).filter(n => !n.read).length);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    supabase.from('notifications').update({ read: true }).eq('id', n.id);
    if (n.target_id && n.target_type === 'post') {
      router.push('/feed');
      setTimeout(() => {
        const el = document.getElementById('post-' + n.target_id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
    } else if (n.type === 'new_subscriber' || n.type === 'subscription_cancel' || n.type === 'ppv_unlocked') {
      router.push('/creator/dashboard');
    } else if (n.type === 'message') {
      router.push('/messages');
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

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative w-9 h-9 rounded-xl bg-hf-card border border-hf-border flex items-center justify-center hover:border-hf-orange transition-all"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-hf-red text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-hf-dark">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-hf-card border border-hf-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-hf-border flex items-center justify-between">
            <h3 className="font-bold text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-hf-orange hover:underline">Mark all read</button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-hf-muted text-sm">No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`px-4 py-3 border-b border-hf-border/50 flex gap-3 transition-colors cursor-pointer hover:bg-hf-border/30 ${!n.read ? 'bg-hf-red/5' : ''}`}
              >
                <span className="text-xl flex-shrink-0">{getIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="text-xs text-hf-muted truncate">{n.body}</p>}
                  <p className="text-[10px] text-hf-muted font-mono mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-hf-orange flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
