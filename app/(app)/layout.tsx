'use client';
import NotificationBell from '@/components/NotificationBell';
import SubscribedDropdown from '@/components/SubscribedDropdown';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import MessageBanner from '@/components/MessageBanner';
import ProfileModal from '@/components/ProfileModal';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const { unreadCount, clearUnread, profileModal, closeProfileModal } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    if (pathname === '/messages') clearUnread();
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;
    if (!user) { redirected.current = true; router.push('/'); return; }
    if (user && !profile) { redirected.current = true; router.push('/onboarding'); return; }
  }, [loading, user, profile, router]);

  useEffect(() => { redirected.current = false; }, [user?.id, profile?.id]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-bunni-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-bunni animate-pulse-glow flex items-center justify-center">
            <span className="text-2xl">🐰</span>
          </div>
          <div className="w-4 h-4 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const isCreator = profile.role === 'creator';

  const creatorNav = [
    { href: '/creator/dashboard', icon: '⚡', label: 'Studio', badge: 0 },
    { href: '/messages', icon: '💬', label: 'Messages', badge: unreadCount },
    { href: '/creator/earnings', icon: '💰', label: 'Earnings', badge: 0 },
    { href: '/profile', icon: '🐰', label: 'Profile', badge: 0 },
    { href: '/settings', icon: '⚙️', label: 'Settings', badge: 0 },
  ];

  const fanNav = [
    { href: '/discover', icon: '🔥', label: 'Discover', badge: 0 },
    { href: '/feed', icon: '⚡', label: 'Feed', badge: 0 },
    { href: '/messages', icon: '💬', label: 'Messages', badge: unreadCount },
    { href: '/profile', icon: '🐰', label: 'Profile', badge: 0 },
    { href: '/settings', icon: '⚙️', label: 'Settings', badge: 0 },
  ];

  const navItems = isCreator ? creatorNav : fanNav;

  return (
    <div className="flex min-h-screen bg-bunni-dark">
      <MessageBanner />
      {profileModal && <ProfileModal username={profileModal} onClose={closeProfileModal} />}

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-bunni-card border-r border-bunni-border flex flex-col z-40">
        {/* Logo */}
        <div className="p-5 border-b border-bunni-border flex items-center justify-between">
          <Link href={isCreator ? '/creator/dashboard' : '/discover'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-bunni flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-base">🐰</span>
            </div>
            <span className="font-display text-xl font-bold text-gradient">BunniX</span>
          </Link>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isCreator ? 'bg-bunni-pink/15 text-bunni-pink border-bunni-pink/20' : 'bg-bunni-cyan/10 text-bunni-cyan border-bunni-cyan/20'}`}>
            {isCreator ? '👑' : '⭐'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group ${
                  active
                    ? 'bg-bunni-pink/15 text-bunni-pink border border-bunni-pink/20'
                    : 'text-bunni-muted hover:text-bunni-text hover:bg-bunni-border/50'
                }`}>
                <span className="text-xl">{item.icon}</span>
                <span className="font-body flex-1 flex items-center gap-2">
                  {item.label}
                  {item.badge > 0 && (
                    <span className="bg-bunni-pink text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-bunni-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bunni-border/30 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-bunni flex-shrink-0">
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
              <p className="text-xs text-bunni-muted truncate">{user.email}</p>
            </div>
            <button onClick={signOut}
              className="opacity-0 group-hover:opacity-100 text-bunni-muted hover:text-red-400 transition-all text-xs"
              title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Top bar with notification bell and subscribed dropdown */}
        <div className="sticky top-0 z-30 bg-bunni-dark/80 backdrop-blur border-b border-bunni-border flex items-center justify-end px-6 py-3 gap-3">
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
