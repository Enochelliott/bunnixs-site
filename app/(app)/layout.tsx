'use client';
import React from 'react';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import NotificationBell from '@/components/NotificationBell';
import NotificationBanner from '@/components/notifications/NotificationBanner';
import SubscribedDropdown from '@/components/SubscribedDropdown';
import ProfileModal from '@/components/ProfileModal';
import GuestModeBanner from '@/components/GuestModeToast';

const creatorNav = [
  { href: '/creator/dashboard', label: 'Studio', icon: '⚡' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/earnings', label: 'Earnings', icon: '💰' },
  { href: '/profile', label: 'Profile', icon: '🔥' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

const fanNav = [
  { href: '/feed', label: 'Feed', icon: '🔥' },
  { href: '/discover', label: 'Discover', icon: '🔍' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/purchases', label: 'My Purchases', icon: '💎' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileChecked, signOut } = useAuth();
  const [unreadMessages, setUnreadMessages] = React.useState(0);

  // Poll for unread message count every 10 seconds
  React.useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const { data: { session } } = await (await import('@/lib/supabase')).createSupabaseBrowserClient().auth.getSession();
        if (!session) return;
        const res = await fetch('/api/unread-count', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.count || 0);
          // Show banner if new message
          if (data.count > 0 && data.latestMessage) {
            // Store latest for banner
          }
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);
  const { profileModal, closeProfileModal } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;
    // Skip redirect for guest mode
    const isGuest = typeof window !== 'undefined' && localStorage.getItem('hf-guest') === 'true';
    if (!user && !isGuest) { redirected.current = true; router.push('/'); return; }
    if (isGuest) return;
    if (user && profileChecked && !profile) { redirected.current = true; router.push('/onboarding'); return; }
    if (user && !profileChecked) {
      const timer = setTimeout(() => {
        if (!profile) { redirected.current = true; router.push('/onboarding'); }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile, profileChecked, router]);

  useEffect(() => { redirected.current = false; }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-hf-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-hf animate-pulse-glow flex items-center justify-center">
            <span className="text-2xl">🔥</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-hf-orange animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-hf-orange animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-hf-orange animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const isCreator = profile.role === 'creator';
  const navItems = isCreator ? creatorNav : fanNav;

  return (
    <div className="flex min-h-screen bg-hf-dark">
      <NotificationBanner />
      <GuestModeBanner />

      {profileModal && (
        <ProfileModal username={profileModal} onClose={closeProfileModal} />
      )}

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-hf-card border-r border-hf-border flex flex-col z-40">
        {/* Logo */}
        <div className="p-4 border-b border-hf-border flex items-center justify-between">
          <Link href={isCreator ? '/creator/dashboard' : '/discover'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-hf flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-base">🔥</span>
            </div>
            <span className="font-display text-xl font-bold text-gradient">HotFans</span>
          </Link>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
            isCreator
              ? 'bg-hf-orange/15 text-hf-orange border border-hf-orange/20'
              : 'bg-hf-red/10 text-hf-red border border-hf-red/20'
          }`}>
            {isCreator ? '👑' : '⭐'}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-hf text-white shadow-lg'
                    : 'text-hf-muted hover:text-hf-text hover:bg-hf-border/50'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
                {item.href === '/messages' && unreadMessages > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] bg-hf-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Legal links */}
        <div className="px-4 pb-2 flex items-center justify-center gap-3 flex-wrap">
          <a href="/legal/terms" className="text-[9px] text-hf-muted/50 hover:text-hf-orange transition-colors font-mono">Terms</a>
          <a href="/legal/privacy" className="text-[9px] text-hf-muted/50 hover:text-hf-orange transition-colors font-mono">Privacy</a>
          <a href="/legal/dmca" className="text-[9px] text-hf-muted/50 hover:text-hf-orange transition-colors font-mono">DMCA</a>
          <a href="/legal/2257" className="text-[9px] text-hf-muted/50 hover:text-hf-orange transition-colors font-mono">2257</a>
        </div>
        {/* User footer */}
        <div className="p-4 border-t border-hf-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-hf-border/30 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-hf flex-shrink-0">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.username} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">@{profile.username}</p>
              <p className="text-xs text-hf-muted truncate">{user.email}</p>
            </div>
            <button onClick={signOut}
              className="opacity-0 group-hover:opacity-100 text-hf-muted hover:text-red-400 transition-all text-xs"
              title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Top header */}
        <div className="sticky top-0 z-30 bg-hf-dark/90 backdrop-blur border-b border-hf-border flex items-center justify-end px-6 py-3 gap-3">
          <SubscribedDropdown />
          <NotificationBell />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </NotificationProvider>
  );
}
