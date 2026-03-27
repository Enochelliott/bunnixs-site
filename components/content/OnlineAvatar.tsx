'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const supabase = createSupabaseBrowserClient();
const cache: Record<string, { online: boolean; ts: number }> = {};

interface Props {
  userId: string;
  username: string;
  avatarUrl: string | null;
  size?: number;
  onClick?: () => void;
}

export default function OnlineAvatar({ userId, username, avatarUrl, size = 40, onClick }: Props) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const cached = cache[userId];
    if (cached && Date.now() - cached.ts < 60000) { setIsOnline(cached.online); return; }
    checkOnline();
  }, [userId]);

  const checkOnline = async () => {
    const { data } = await supabase.from('profiles').select('updated_at').eq('id', userId).single();
    if (!data?.updated_at) return;
    const online = Date.now() - new Date(data.updated_at).getTime() < 15 * 60 * 1000;
    cache[userId] = { online, ts: Date.now() };
    setIsOnline(online);
  };

  const borderColor = isOnline ? '#22c55e' : '#FF6B00';
  const s = size;

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer"
      style={{ width: s + 4, height: s + 4 }}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: isOnline ? '#22c55e' : '#FF6B00', padding: 2, borderRadius: '50%' }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={username} width={s} height={s} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ fontSize: s * 0.35, background: 'linear-gradient(135deg, #CC2400, #FF6B00)' }}
            >
              {username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
      {isOnline && (
        <div
          className="absolute bottom-0 right-0 bg-green-400 rounded-full border-2 border-hf-card"
          style={{ width: s * 0.28, height: s * 0.28 }}
        />
      )}
    </div>
  );
}
