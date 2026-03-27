'use client';
import { Suspense } from 'react';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

function VerifyCompleteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const status = searchParams.get('status') || 'pending';
  const [countdown, setCountdown] = useState(5);

  const isSuccess = status === 'success' || status === 'approved';
  const isFailed = status === 'declined' || status === 'resubmission_requested';
  const isPending = !isSuccess && !isFailed;

  const destination = profile?.role === 'creator' ? '/creator/dashboard' : '/discover';

  useEffect(() => {
    if (isSuccess) {
      toast.success('Identity verified! Welcome to HotFans 🔥', { duration: 5000 });
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); router.push(destination); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router, destination]);

  return (
    <div className="min-h-screen bg-hf-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-hf flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🔥</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-gradient">HotFans</h1>
          <p className="text-hf-muted text-sm mt-1">Where fans get closer</p>
        </div>

        <div className="bg-hf-card border border-hf-border rounded-3xl p-8 text-center">
          {isSuccess && (
            <>
              <p className="text-6xl mb-4">🎉</p>
              <h2 className="font-display text-2xl font-bold mb-3">You're Verified!</h2>
              <p className="text-hf-muted text-sm leading-relaxed mb-2">
                Your identity has been confirmed. You're all set to{' '}
                {profile?.role === 'creator' ? 'start posting and earning' : 'explore HotFans'}.
              </p>
              <p className="text-hf-orange font-semibold text-sm mb-6">Welcome to HotFans 🔥</p>
            </>
          )}
          {isPending && (
            <>
              <p className="text-6xl mb-4">⏳</p>
              <h2 className="font-display text-2xl font-bold mb-3">Verification Submitted!</h2>
              <p className="text-hf-muted text-sm leading-relaxed mb-6">
                Your verification is being reviewed. This usually takes a few minutes.
                You'll get a notification once approved.
              </p>
            </>
          )}
          {isFailed && (
            <>
              <p className="text-6xl mb-4">😕</p>
              <h2 className="font-display text-2xl font-bold mb-3">Verification Needs Attention</h2>
              <p className="text-hf-muted text-sm leading-relaxed mb-4">
                We weren't able to verify your identity this time. Don't worry — you can try again.
              </p>
              <button onClick={() => router.push(destination)} className="w-full py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 transition-all mb-3">
                Try Again
              </button>
              <button onClick={() => router.push('/verify/contact')} className="w-full py-3 bg-hf-dark border border-hf-border text-hf-muted rounded-xl text-sm hover:border-hf-orange transition-all">
                Contact Support
              </button>
            </>
          )}
          {!isFailed && (
            <>
              <p className="text-xs text-hf-muted mb-4">
                Redirecting to {profile?.role === 'creator' ? 'your dashboard' : 'discover'} in {countdown}s...
              </p>
              <button onClick={() => router.push(destination)} className="w-full py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 transition-all">
                {profile?.role === 'creator' ? '🔥 Go to Dashboard' : '🔥 Start Exploring'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyCompletePage() { return <Suspense><VerifyCompleteInner /></Suspense>; }