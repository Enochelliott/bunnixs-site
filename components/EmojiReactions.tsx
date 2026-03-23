'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();
const EMOJIS = ['❤️', '🔥', '😍', '💦', '🍑', '😈', '👑', '💎'];

interface Props {
  targetId: string;
  targetType: 'post' | 'comment';
  postOwnerId?: string;
}

interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean;
}

export default function EmojiReactions({ targetId, targetType, postOwnerId }: Props) {
  const { user, profile } = useAuth();
  const [reactions, setReactions] = useState<Record<string, ReactionCount>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [targetId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('emoji, user_id')
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (!data) return;

    const counts: Record<string, ReactionCount> = {};
    EMOJIS.forEach(emoji => {
      counts[emoji] = { emoji, count: 0, reacted: false };
    });
    data.forEach(r => {
      if (counts[r.emoji]) {
        counts[r.emoji].count++;
        if (r.user_id === user?.id) counts[r.emoji].reacted = true;
      }
    });
    setReactions(counts);
  };

  const handleReact = async (emoji: string) => {
    if (!user) return;
    setLoading(true);

    const existing = reactions[emoji]?.reacted;

    // Optimistic update
    setReactions(prev => ({
      ...prev,
      [emoji]: {
        ...prev[emoji],
        count: existing ? prev[emoji].count - 1 : prev[emoji].count + 1,
        reacted: !existing,
      }
    }));

    if (existing) {
      await supabase.from('reactions').delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('emoji', emoji);
    } else {
      await supabase.from('reactions').insert({
        user_id: user.id,
        emoji,
        target_type: targetType,
        target_id: targetId,
      });
      // Notify post owner
      if (targetType === 'post' && postOwnerId && user.id !== postOwnerId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          type: 'like',
          title: emoji + ' New Reaction',
          body: '@' + (profile?.username || 'Someone') + ' reacted ' + emoji + ' to your post',
          actor_id: user.id,
          target_id: targetId,
          target_type: 'post',
          read: false,
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {EMOJIS.map(emoji => {
        const r = reactions[emoji];
        const active = r?.reacted;
        const count = r?.count || 0;
        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={loading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all border ${
              active
                ? 'bg-bunni-pink/20 border-bunni-pink/50 scale-105'
                : 'bg-bunni-dark border-bunni-border hover:border-bunni-pink/40 hover:bg-bunni-pink/10'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className={`text-[11px] font-mono font-bold ${active ? 'text-bunni-pink' : 'text-bunni-muted'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
