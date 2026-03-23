'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

// module-level supabase
const supabase = createSupabaseBrowserClient();

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // If already logged in redirect immediately
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          router.push('/onboarding');
        } else if (profile.role === 'creator') {
          router.push('/creator/dashboard');
        } else {
          router.push('/discover');
        }
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  // Show nothing while checking session
  if (checking) {
    return (
      <div className="min-h-screen bg-bunni-dark flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-bunni animate-pulse-glow flex items-center justify-center">
          <span className="text-2xl">🐰</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bunni-dark flex items-center justify-center relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-bunni-purple/10 blur-[120px]" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-bunni-pink/10 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-bunni-cyan/8 blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="orbit-1 absolute w-3 h-3 rounded-full bg-bunni-pink glow-pink" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="orbit-2 absolute w-2 h-2 rounded-full bg-bunni-cyan glow-cyan" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="orbit-3 absolute w-1.5 h-1.5 rounded-full bg-bunni-lime" />
        </div>
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,45,138,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,138,1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-bunni mb-4 animate-pulse-glow">
            <span className="text-3xl">🐰</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-gradient mb-2">BunniX</h1>
          <p className="text-bunni-muted text-sm font-mono tracking-widest uppercase">
            Your private world
          </p>
        </div>

        {/* Card */}
        <div className="bg-bunni-card border border-bunni-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-bunni opacity-60" />

          {!sent ? (
            <>
              <h2 className="font-display text-2xl font-semibold mb-2">Welcome</h2>
              <p className="text-bunni-muted text-sm mb-8">
                Enter your email and we&apos;ll send you a magic link to sign in or create your account.
              </p>

              <form onSubmit={handleMagicLink} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-bunni-muted uppercase mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full bg-bunni-dark border border-bunni-border rounded-xl px-4 py-3 text-bunni-text placeholder-bunni-muted focus:border-bunni-pink focus:shadow-[0_0_0_2px_rgba(255,45,138,0.15)] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-gradient-bunni text-white font-display font-semibold py-3.5 rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Magic Link ✨'
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-bunni-muted mt-6">
                No password needed. No tracking. Just vibes.
              </p>
            </>
          ) : (
            <div className="text-center py-4 animate-scale-in">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="font-display text-2xl font-semibold mb-2">Check your inbox</h2>
              <p className="text-bunni-muted text-sm mb-6">
                We sent a magic link to{' '}
                <span className="text-bunni-pink font-medium">{email}</span>.
                <br />
                Click it to sign in — link expires in 1 hour.
              </p>
              <p className="text-xs text-bunni-muted mb-4">
                New to BunniX? You will be taken to set up your account after clicking the link.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-xs text-bunni-muted hover:text-bunni-pink transition-colors font-mono"
              >
                ← Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
