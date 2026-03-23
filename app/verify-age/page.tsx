'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyAgePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const type = searchParams.get('type') || 'confirm';
  const redirect = searchParams.get('redirect') || '/feed';
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleOneClick = async () => {
    setConfirming(true);
    document.cookie = 'age_verified=true; max-age=31536000; path=/; SameSite=Lax';

    // Save to approved_fans if logged in
    if (user) {
      await fetch('/api/approved-fans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'one_click', userId: user.id }),
      });
    }

    setTimeout(() => router.push(redirect), 500);
  };

  const handleVeriff = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/veriff/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationType: 'fan',
          userId: user?.id || null,
        }),
      });
      const data = await res.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert('Could not start verification. Please try again.');
        setVerifying(false);
      }
    } catch (err) {
      alert('Could not start verification. Please try again.');
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-bunni-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-gradient mb-2">BunniX</h1>
          <p className="text-bunni-muted text-sm font-mono">Your Private World</p>
        </div>

        <div className="bg-bunni-card border border-bunni-border rounded-3xl p-8">
          {type === 'confirm' ? (
            <>
              <div className="text-center mb-6">
                <p className="text-4xl mb-4">🔞</p>
                <h2 className="font-display text-2xl font-bold mb-2">Age Verification</h2>
                <p className="text-bunni-muted text-sm leading-relaxed">
                  This platform contains adult content intended for users 18 years of age or older.
                  By continuing you confirm that you are at least 18 years old.
                </p>
              </div>

              <button
                onClick={handleOneClick}
                disabled={confirming}
                className="w-full py-4 bg-gradient-bunni text-white font-bold text-lg rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all mb-4"
              >
                {confirming ? 'Confirmed ✓' : 'I confirm I am 18 or older'}
              </button>

              <p className="text-center text-xs text-bunni-muted">
                By clicking above you agree to our Terms of Service and confirm you are of legal age in your jurisdiction.
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-4xl mb-4">🪪</p>
                <h2 className="font-display text-2xl font-bold mb-2">ID Verification Required</h2>
                <p className="text-bunni-muted text-sm leading-relaxed">
                  Your region requires identity verification to access adult content.
                  This is a quick 60-second process — you'll need a valid ID and your camera.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: '📸', text: 'Take a photo of your ID' },
                  { icon: '🤳', text: 'Take a quick selfie' },
                  { icon: '✅', text: 'Get instant access' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 bg-bunni-dark rounded-xl p-3">
                    <span className="text-2xl">{step.icon}</span>
                    <span className="text-sm text-bunni-text">{step.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleVeriff}
                disabled={verifying}
                className="w-full py-4 bg-gradient-bunni text-white font-bold text-lg rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all mb-4"
              >
                {verifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting verification...
                  </span>
                ) : 'Start Verification →'}
              </button>

              <p className="text-center text-xs text-bunni-muted">
                Powered by Veriff. Your data is encrypted and never shared.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-bunni-muted mt-6">
          Leave this page if you are under 18 or if adult content is illegal in your jurisdiction.
        </p>
      </div>
    </div>
  );
}
