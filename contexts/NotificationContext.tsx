'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const supabase = createSupabaseBrowserClient();

interface NotificationBanner {
  id: string;
  message: string;
  from: string;
  avatar?: string;
}

interface NotificationContextType {
  unreadCount: number;
  clearUnread: () => void;
  banner: NotificationBanner | null;
  dismissBanner: () => void;
  profileModal: string | null;
  openProfileModal: (username: string) => void;
  closeProfileModal: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  clearUnread: () => {},
  banner: null,
  dismissBanner: () => {},
  profileModal: null,
  openProfileModal: () => {},
  closeProfileModal: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [banner, setBanner] = useState<NotificationBanner | null>(null);
  const [profileModal, setProfileModal] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const prevCountRef = useRef(0);

  const dismissBanner = useCallback(() => {
    setBanner(null);
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    prevCountRef.current = 0;
  }, []);

  const openProfileModal = useCallback((username: string) => setProfileModal(username), []);
  const closeProfileModal = useCallback(() => setProfileModal(null), []);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Call Stream to get unread count via our API
      const res = await fetch('/api/unread-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) return;
      const { count, latestMessage } = await res.json();

      setUnreadCount(count);

      // Show banner if count increased
      if (count > prevCountRef.current && latestMessage) {
        setBanner({
          id: latestMessage.id || String(Date.now()),
          message: (latestMessage.text || 'Sent you a message').slice(0, 60),
          from: latestMessage.from || 'Someone',
          avatar: latestMessage.avatar,
        });
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = setTimeout(() => setBanner(null), 5000);
      }
      prevCountRef.current = count;
    } catch (e) {
      // silent
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Poll every 8 seconds
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [user?.id, fetchUnread]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      clearUnread,
      banner,
      dismissBanner,
      profileModal,
      openProfileModal,
      closeProfileModal,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
