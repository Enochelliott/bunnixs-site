'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Global guest mode checker - call this before any interactive action
export function useGuestMode() {
  const isGuest = typeof window !== 'undefined' && localStorage.getItem('hf-guest') === 'true';
  return isGuest;
}

export default function GuestModeBanner() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    setIsGuest(localStorage.getItem('hf-guest') === 'true');
  }, []);

  if (!isGuest) return null;

  return (
    <>
      {/* Top banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-hf text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-3">
        <span>👀 You're browsing in Guest Mode</span>
        <button
          onClick={() => { localStorage.removeItem('hf-guest'); router.push('/'); }}
          className="bg-white/20 hover:bg-white/30 px-3 py-0.5 rounded-full text-xs transition-all"
        >
          Create Account →
        </button>
      </div>

      {/* Guest action modal */}
      {show && (
        <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4">
          <div className="bg-hf-card border border-hf-orange rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in">
            <p className="text-4xl mb-4">👀</p>
            <h3 className="font-display text-2xl font-bold mb-2">Guest Mode</h3>
            <p className="text-hf-muted mb-6">Create a free account to subscribe, comment, message creators, and more!</p>
            <div className="flex gap-3">
              <button onClick={() => setShow(false)} className="flex-1 py-3 bg-hf-dark border border-hf-border rounded-xl text-sm">
                Keep Browsing
              </button>
              <button
                onClick={() => { localStorage.removeItem('hf-guest'); router.push('/'); }}
                className="flex-1 py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 transition-all"
              >
                🔥 Join Free
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export a function components can call to show the guest modal
export function GuestActionModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-hf-card border border-hf-orange rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in" onClick={e => e.stopPropagation()}>
        <p className="text-4xl mb-4">👀</p>
        <h3 className="font-display text-2xl font-bold mb-2">You're in Guest Mode</h3>
        <p className="text-hf-muted mb-6">Create a free account to interact with creators — subscribe, comment, message, tip, and unlock exclusive content!</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-hf-dark border border-hf-border rounded-xl text-sm text-hf-muted hover:border-hf-muted transition-all">
            Keep Browsing
          </button>
          <button
            onClick={() => { localStorage.removeItem('hf-guest'); router.push('/'); }}
            className="flex-1 py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 transition-all"
          >
            🔥 Join Free
          </button>
        </div>
      </div>
    </div>
  );
}
