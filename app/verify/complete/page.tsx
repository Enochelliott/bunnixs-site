'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status') || 'pending';
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/feed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const isSuccess = status === 'success' || status === 'approved';
  const isPending = status === 'pending' || !status;

  return (
    <div className="min-h-screen bg-bunni-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-gradient mb-2">BunniX</h1>
        </div>

        <div className="bg-bunni-card border border-bunni-border rounded-3xl p-8 text-center">
          {isPending && (
            <>
              <p className="text-5xl mb-4">⏳</p>
              <h2 className="font-display text-2xl font-bold mb-3">Verification Submitted!</h2>
              <p className="text-bunni-muted text-sm leading-relaxed mb-6">
                Your verification is being processed. This usually takes just a few seconds.
                You'll receive a notification once it's complete.
              </p>
            </>
          )}

          {isSuccess && (
            <>
              <p className="text-5xl mb-4">🎉</p>
              <h2 className="font-display text-2xl font-bold mb-3">Verified!</h2>
              <p className="text-bunni-muted text-sm leading-relaxed mb-6">
                Your identity has been verified successfully. Welcome to BunniX!
              </p>
            </>
          )}

          {!isSuccess && !isPending && (
            <>
              <p className="text-5xl mb-4">❌</p>
              <h2 className="font-display text-2xl font-bold mb-3">Verification Failed</h2>
              <p className="text-bunni-muted text-sm leading-relaxed mb-6">
                We couldn't verify your identity. Please try again or contact support.
              </p>
            </>
          )}

          <p className="text-xs text-bunni-muted">Redirecting in {countdown} seconds...</p>

          <button
            onClick={() => router.push('/feed')}
            className="mt-4 w-full py-3 bg-gradient-bunni text-white font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Go to Feed →
          </button>
        </div>
      </div>
    </div>
  );
}
