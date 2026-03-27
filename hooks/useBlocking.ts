'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface UseBlockingResult {
  isBlocked: boolean;
  hasBlockedMe: boolean;
  loading: boolean;
  block: (targetId: string) => Promise<boolean>;
  unblock: (targetId: string) => Promise<boolean>;
}

export function useBlocking(targetId: string): UseBlockingResult {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkBlocking = useCallback(async () => {
    if (!user || !targetId) { setLoading(false); return; }

    const [{ data: iBlocked }, { data: theyBlocked }] = await Promise.all([
      supabase.from('blocked_users').select('id')
        .eq('blocker_id', user.id).eq('blocked_id', targetId).maybeSingle(),
      supabase.from('blocked_users').select('id')
        .eq('blocker_id', targetId).eq('blocked_id', user.id).maybeSingle(),
    ]);

    setIsBlocked(!!iBlocked);
    setHasBlockedMe(!!theyBlocked);
    setLoading(false);
  }, [user, targetId]);

  useEffect(() => { checkBlocking(); }, [checkBlocking]);

  const block = async (targetId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await supabase.from('blocked_users').insert({
        blocker_id: user.id,
        blocked_id: targetId,
      });
      setIsBlocked(true);
      return true;
    } catch (err) {
      console.error('block error:', err);
      return false;
    }
  };

  const unblock = async (targetId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await supabase.from('blocked_users').delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetId);
      setIsBlocked(false);
      return true;
    } catch (err) {
      console.error('unblock error:', err);
      return false;
    }
  };

  return { isBlocked, hasBlockedMe, loading, block, unblock };
}
