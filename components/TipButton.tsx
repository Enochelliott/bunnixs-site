'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

const TIP_AMOUNTS = [1, 3, 5, 10, 20, 50];

interface Props {
  creatorId: string;
  creatorUsername: string;
  postId?: string; // optional - tip on a specific post
}

export default function TipButton({ creatorId, creatorUsername, postId }: Props) {
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || user.id === creatorId) return null;

  const finalAmount = amount || parseFloat(customAmount) || 0;

  const handleTip = async () => {
    if (!finalAmount || finalAmount < 1) { toast.error('Minimum tip is $1'); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session?.access_token },
        body: JSON.stringify({ creatorId, postId, amount: finalAmount, message }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`💰 $${finalAmount} tip sent to @${creatorUsername}!`);
        // Insert notification for creator
        await supabase.from('notifications').insert({
          user_id: creatorId,
          type: 'tip',
          title: '💰 New Tip!',
          body: `@${profile?.username} tipped you $${finalAmount}${message ? ': "' + message + '"' : ''}`,
          actor_id: user.id,
          target_id: postId || null,
          target_type: postId ? 'post' : null,
          read: false,
        });
        setShowModal(false);
        setAmount(null);
        setCustomAmount('');
        setMessage('');
      } else {
        toast.error(data.error || 'Could not send tip');
      }
    } catch { toast.error('Could not send tip'); }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hf-border text-hf-muted hover:border-yellow-400 hover:text-yellow-400 transition-all text-sm"
      >
        💰 Tip
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-hf-card border border-hf-border rounded-3xl p-6 w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-1">💰 Tip @{creatorUsername}</h3>
            <p className="text-hf-muted text-xs mb-5">Show your appreciation with a tip</p>

            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {TIP_AMOUNTS.map(a => (
                <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    amount === a ? 'bg-gradient-hf text-white border-transparent' : 'border-hf-border text-hf-muted hover:border-hf-orange hover:text-hf-orange'
                  }`}>
                  ${a}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hf-muted">$</span>
              <input
                type="number" min="1" placeholder="Custom amount"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setAmount(null); }}
                className="w-full bg-hf-dark border border-hf-border rounded-xl pl-7 pr-4 py-2.5 text-sm text-hf-text focus:border-hf-orange transition-colors"
              />
            </div>

            {/* Message */}
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Add a message (optional)"
              rows={2} maxLength={200}
              className="w-full bg-hf-dark border border-hf-border rounded-xl px-4 py-2.5 text-sm text-hf-text focus:border-hf-orange transition-colors mb-4 resize-none"
            />

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-hf-dark border border-hf-border rounded-xl text-sm hover:border-hf-muted transition-all">
                Cancel
              </button>
              <button onClick={handleTip} disabled={loading || !finalAmount}
                className="flex-1 py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all">
                {loading ? 'Sending...' : `💰 Send $${finalAmount || 0}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
