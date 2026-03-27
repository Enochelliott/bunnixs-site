'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import toast from 'react-hot-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const supabase = createSupabaseBrowserClient();

interface Props {
  creatorId: string;
  creatorUsername: string;
  onCancelled?: () => void;
}

export default function SubscribedTag({ creatorId, creatorUsername, onCancelled }: Props) {
  const { isSubscribed, refetch } = useSubscription(creatorId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!isSubscribed) return null;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session?.access_token,
        },
        body: JSON.stringify({ creatorId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Subscription cancelled. Access continues until end of billing period.');
        await refetch();
        setShowConfirm(false);
        onCancelled?.();
      } else {
        toast.error(data.error || 'Could not cancel');
      }
    } catch {
      toast.error('Could not cancel');
    }
    setCancelling(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-red-500/10 hover:border-red-400/30 hover:text-red-400 transition-all"
      >
        ✓ Subscribed
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-hf-card border border-hf-border rounded-3xl w-full max-w-xs p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl mb-3">😢</p>
            <h3 className="font-bold text-lg mb-2">Unsubscribe from @{creatorUsername}?</h3>
            <p className="text-hf-muted text-sm mb-6">You'll lose access to their exclusive content. You can resubscribe anytime.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-hf-border rounded-xl text-sm font-semibold hover:bg-hf-muted/20 transition-all"
              >
                No, stay
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 disabled:opacity-60 transition-all"
              >
                {cancelling ? '...' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
