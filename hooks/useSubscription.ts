'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface UseSubscriptionResult {
  isSubscribed: boolean;
  isFirstTime: boolean;
  loading: boolean;
  subscribe: (creatorId: string, price: number, saleId?: string) => Promise<boolean>;
  cancel: (creatorId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useSubscription(creatorId: string): UseSubscriptionResult {
  const { user, profile } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user || !creatorId) { setLoading(false); return; }

    const { data } = await supabase
      .from('subscriptions')
      .select('id, status, is_first_time')
      .eq('fan_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .maybeSingle();

    setIsSubscribed(!!data);

    // Check if they've EVER subscribed (for first-time sale eligibility)
    const { data: history } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('fan_id', user.id)
      .eq('creator_id', creatorId)
      .limit(1);

    setIsFirstTime(!history?.length);
    setLoading(false);
  }, [user, creatorId]);

  useEffect(() => { refetch(); }, [refetch]);

  const subscribe = async (creatorId: string, price: number, saleId?: string): Promise<boolean> => {
    if (!user || !profile) return false;
    try {
      // Check if already subscribed
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('fan_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (existing?.status === 'active') return true;

      const { error } = await supabase.from('subscriptions').upsert({
        fan_id: user.id,
        creator_id: creatorId,
        status: 'active',
        creator_price: price,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        sale_id: saleId || null,
        is_first_time: isFirstTime,
        payment_provider: 'pending',
      }, { onConflict: 'fan_id,creator_id' });

      if (error) throw error;

      setIsSubscribed(true);
      setIsFirstTime(false);
      return true;
    } catch (err) {
      console.error('subscribe error:', err);
      return false;
    }
  };

  const cancel = async (creatorId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq('fan_id', user.id)
        .eq('creator_id', creatorId);

      if (error) throw error;
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('cancel error:', err);
      return false;
    }
  };

  return { isSubscribed, isFirstTime, loading, subscribe, cancel, refetch };
}
