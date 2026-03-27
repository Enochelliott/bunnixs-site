'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

interface Props {
  creatorId: string;
  creatorUsername: string;
  subscriptionPrice: number;
  onSubscribed?: () => void;
}

export default function SubscribeButton({ creatorId, creatorUsername, subscriptionPrice, onSubscribed }: Props) {
  const { user } = useAuth();
  const { isSubscribed, isFirstTime, loading, subscribe, refetch } = useSubscription(creatorId);
  const [subscribing, setSubscribing] = useState(false);
  const [activeSale, setActiveSale] = useState<any>(null);

  useEffect(() => {
    fetchActiveSale();
  }, [creatorId]);

  const fetchActiveSale = async () => {
    const res = await fetch(`/api/sales?creatorId=${creatorId}`);
    const data = await res.json();
    const sales = data.sales || [];
    // Find applicable sale
    const sale = sales.find((s: any) => {
      if (s.first_time_only && !isFirstTime) return false;
      return true;
    });
    setActiveSale(sale || null);
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error('Please log in'); return; }
    if (isSubscribed) return;
    setSubscribing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session?.access_token,
        },
        body: JSON.stringify({ creatorId, saleId: activeSale?.id }),
      });

      const data = await res.json();
      if (data.success) {
        await refetch();
        toast.success(`Subscribed to @${creatorUsername}! ⭐`);
        onSubscribed?.();
      } else {
        toast.error(data.error || 'Could not subscribe');
      }
    } catch {
      toast.error('Could not subscribe');
    }
    setSubscribing(false);
  };

  if (loading) return null;

  if (isSubscribed) {
    return (
      <button className="px-4 py-2 rounded-xl bg-bunni-lime/15 border border-bunni-lime/40 text-bunni-lime text-xs font-semibold cursor-default">
        ✓ Subscribed
      </button>
    );
  }

  const displayPrice = activeSale
    ? subscriptionPrice * (1 - activeSale.discount_percent / 100)
    : subscriptionPrice;

  return (
    <div className="flex flex-col items-end gap-1">
      {activeSale && (
        <span className="text-[10px] font-mono text-bunni-pink bg-bunni-pink/10 px-2 py-0.5 rounded-full">
          🔥 {activeSale.discount_percent}% OFF{activeSale.first_time_only ? ' — New subscribers' : ''}
        </span>
      )}
      <button
        onClick={handleSubscribe}
        disabled={subscribing}
        className="px-5 py-2 rounded-xl bg-gradient-bunni text-white text-xs font-bold hover:opacity-90 hover:scale-[1.02] transition-all glow-pink disabled:opacity-60"
      >
        {subscribing ? 'Subscribing...' : (
          displayPrice > 0
            ? `Subscribe · $${(displayPrice * 1.30).toFixed(2)}/mo`
            : 'Follow Free'
        )}
      </button>
    </div>
  );
}
