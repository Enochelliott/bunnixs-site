'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

export default function LaunchSale() {
  const [open, setOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(20);
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [durationHours, setDurationHours] = useState(48);
  const [launching, setLaunching] = useState(false);

  const handleLaunch = async () => {
    if (discountPercent < 1 || discountPercent > 100) {
      toast.error('Discount must be between 1-100%');
      return;
    }
    setLaunching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session?.access_token,
        },
        body: JSON.stringify({ discountPercent, firstTimeOnly, isPublic, durationHours }),
      });
      const data = await res.json();
      if (data.sale) {
        toast.success(`🔥 Sale launched! ${discountPercent}% off for ${durationHours}h`);
        setOpen(false);
      } else {
        toast.error(data.error || 'Could not launch sale');
      }
    } catch {
      toast.error('Could not launch sale');
    }
    setLaunching(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-bunni-dark border border-bunni-border rounded-xl text-xs font-mono text-bunni-muted hover:border-bunni-pink hover:text-bunni-pink transition-all"
      >
        🔥 Launch Sale
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-bunni-card border border-bunni-border rounded-3xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-bold">🔥 Launch Sale</h3>
              <button onClick={() => setOpen(false)} className="text-bunni-muted hover:text-white">✕</button>
            </div>

            {/* Discount */}
            <div className="mb-4">
              <label className="text-xs text-bunni-muted font-mono mb-2 block">Discount %</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {[10, 20, 25, 30, 50, 75].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      discountPercent === pct
                        ? 'bg-bunni-pink text-white border-bunni-pink'
                        : 'bg-bunni-dark border-bunni-border text-bunni-muted hover:border-bunni-pink hover:text-bunni-pink'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <input
                type="number" min="1" max="100"
                value={discountPercent || ''}
                placeholder="Custom %"
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') { setDiscountPercent(0); return; }
                  const num = Math.min(100, Math.max(1, Number(val)));
                  setDiscountPercent(num);
                }}
                className="w-full bg-bunni-dark border border-bunni-border rounded-xl px-3 py-2 text-sm focus:border-bunni-pink transition-colors placeholder:text-bunni-muted/50"
              />
            </div>

            {/* Duration */}
            <div className="mb-4">
              <label className="text-xs text-bunni-muted font-mono mb-1 block">Duration</label>
              <select
                value={durationHours}
                onChange={e => setDurationHours(Number(e.target.value))}
                className="w-full bg-bunni-dark border border-bunni-border rounded-xl px-3 py-2 text-sm focus:border-bunni-pink transition-colors"
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>1 week</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">First-time subscribers only</p>
                  <p className="text-xs text-bunni-muted">Only fans who have never subscribed before</p>
                </div>
                <div
                  onClick={() => setFirstTimeOnly(!firstTimeOnly)}
                  className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${firstTimeOnly ? 'bg-bunni-pink' : 'bg-bunni-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${firstTimeOnly ? 'left-5' : 'left-1'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">Make sale public</p>
                  <p className="text-xs text-bunni-muted">Posts announcement to your feed</p>
                </div>
                <div
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${isPublic ? 'bg-bunni-pink' : 'bg-bunni-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-5' : 'left-1'}`} />
                </div>
              </label>
            </div>

            <button
              onClick={handleLaunch}
              disabled={launching}
              className="w-full py-3 bg-gradient-bunni text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {launching ? 'Launching...' : `🔥 Launch ${discountPercent}% Off Sale`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
