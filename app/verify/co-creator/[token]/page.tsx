'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const supabase = createSupabaseBrowserClient();

export default function CoCreatorVerifyPage() {
  const { token } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'used' | 'expired' | 'verifying' | 'done'>('loading');
  const [creatorName, setCreatorName] = useState('');

  useEffect(() => {
    if (!token) return;
    checkInvite();
  }, [token]);

  const checkInvite = async () => {
    const { data: invite, error } = await supabase
      .from('co_creator_invites')
      .select('*')
      .eq('token', token)
      .single();

    console.log('[invite]', invite, error);

    if (!invite) { setStatus('invalid'); return; }
    if (invite.status === 'used') { setStatus('used'); return; }
    if (new Date(invite.expires_at) < new Date()) { setStatus('expired'); return; }

    // Fetch creator profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', invite.creator_id)
      .single();

    const name = profile?.display_name || profile?.username || 'a creator';
    setCreatorName(name);
    setStatus('valid');
  };

  const startVerification = async () => {
    setStatus('verifying');
    try {
      const res = await fetch('/api/veriff/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationType: 'co_creator',
          inviteToken: token,
        }),
      });
      const data = await res.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        setStatus('valid');
        alert('Could not start verification. Please try again.');
      }
    } catch (err) {
      setStatus('valid');
      alert('Could not start verification. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-bunni-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-gradient mb-2">BunniX</h1>
          <p className="text-bunni-muted text-sm font-mono">Creator Verification</p>
        </div>

        <div className="bg-bunni-card border border-bunni-border rounded-3xl p-8">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <p className="text-4xl mb-4">❌</p>
              <h2 className="font-display text-xl font-bold mb-2">Invalid Link</h2>
              <p className="text-bunni-muted text-sm">This verification link is invalid. Please ask the creator to send you a new one.</p>
            </div>
          )}

          {status === 'used' && (
            <div className="text-center">
              <p className="text-4xl mb-4">✅</p>
              <h2 className="font-display text-xl font-bold mb-2">Already Verified</h2>
              <p className="text-bunni-muted text-sm">This invite link has already been used.</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center">
              <p className="text-4xl mb-4">⏰</p>
              <h2 className="font-display text-xl font-bold mb-2">Link Expired</h2>
              <p className="text-bunni-muted text-sm">This link has expired. Please ask the creator to send you a new one.</p>
            </div>
          )}

          {status === 'valid' && (
            <>
              <div className="text-center mb-6">
                <p className="text-4xl mb-4">🪪</p>
                <h2 className="font-display text-2xl font-bold mb-2">You've Been Invited!</h2>
                <p className="text-bunni-muted text-sm leading-relaxed">
                  <span className="text-bunni-pink font-semibold">@{creatorName}</span> has invited you to be a verified co-creator on BunniX.
                  To accept, you need to verify your age and identity. This takes about 60 seconds.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: '📸', text: 'Photo of your government-issued ID' },
                  { icon: '🤳', text: "Quick selfie to confirm it's you" },
                  { icon: '✅', text: 'Instant verification result' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 bg-bunni-dark rounded-xl p-3">
                    <span className="text-2xl">{step.icon}</span>
                    <span className="text-sm text-bunni-text">{step.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={startVerification}
                className="w-full py-4 bg-gradient-bunni text-white font-bold text-lg rounded-2xl hover:opacity-90 transition-all mb-4"
              >
                Start Verification →
              </button>

              <p className="text-center text-xs text-bunni-muted">
                Powered by Veriff. Your data is encrypted and secure. Must be 18+ to continue.
              </p>
            </>
          )}

          {status === 'verifying' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin mx-auto mb-4" />
              <p className="text-bunni-muted text-sm">Starting verification...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center">
              <p className="text-4xl mb-4">🎉</p>
              <h2 className="font-display text-xl font-bold mb-2">Verification Complete!</h2>
              <p className="text-bunni-muted text-sm mb-4">You've been verified as a co-creator. The creator has been notified.</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-bunni text-white font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Join BunniX 🐰
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
