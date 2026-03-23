'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  actor_id?: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
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
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications(data || []);
    setUnread((data || []).filter(n => !n.read).length);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const typeIcon = (type: string) => {
    const icons: Record<string, string> = {
      like: '❤️', comment: '💬', new_subscriber: '⭐',
      new_post: '✨', verification_approved: '✅',
      verification_rejected: '❌', co_creator_verified: '🎉',
      ppv_unlocked: '💎', tip_received: '💰',
    };
    return icons[type] || '🔔';
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bunni-card transition-all"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-bunni-pink text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-bunni-card border border-bunni-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-bunni-border flex items-center justify-between">
            <h3 className="font-display font-bold text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-bunni-muted hover:text-bunni-pink transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-bunni-muted text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-bunni-border/50 flex gap-3 transition-colors ${!n.read ? 'bg-bunni-pink/5' : ''}`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-bunni-text truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-bunni-muted mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-bunni-muted/60 mt-1 font-mono">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-bunni-pink rounded-full flex-shrink-0 mt-2" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
