'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useNotifications } from '@/contexts/NotificationContext';

export default function MessageBanner() {
  const { banner, dismissBanner } = useNotifications();
  const router = useRouter();

  if (!banner) return null;

  const handleClick = () => {
    dismissBanner();
    router.push('/messages');
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
      <div className="flex items-center gap-3 bg-bunni-card border border-bunni-pink/40 rounded-2xl px-4 py-3 shadow-2xl shadow-bunni-pink/20 min-w-72 max-w-sm">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-bunni flex-shrink-0">
          {banner.avatar ? (
            <Image src={banner.avatar} alt={banner.from} width={36} height={36} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
              {banner.from[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Text — clickable */}
        <button onClick={handleClick} className="flex-1 text-left min-w-0">
          <p className="text-xs font-mono text-bunni-pink font-semibold">💬 New message</p>
          <p className="text-sm font-semibold truncate">{banner.from}</p>
          <p className="text-xs text-bunni-muted truncate">{banner.message}</p>
        </button>

        {/* Dismiss X */}
        <button
          onClick={e => { e.stopPropagation(); dismissBanner(); }}
          className="w-6 h-6 rounded-full bg-bunni-border text-bunni-muted hover:bg-bunni-pink hover:text-white transition-all text-xs flex items-center justify-center flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
