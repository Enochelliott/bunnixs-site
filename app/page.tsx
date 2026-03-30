'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles').select('id, role').eq('id', session.user.id).single();
        if (!profile) { router.push('/onboarding'); }
        else if (profile.role === 'creator') { router.push('/creator/dashboard'); }
        else { router.push('/discover'); }
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { toast.error(error.message); }
    else { setSent(true); }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-hf-dark flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-hf animate-pulse-glow flex items-center justify-center">
          <span className="text-2xl">🔥</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hf-dark flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-hf-red/10 blur-[120px]" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-hf-orange/10 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-hf-red/8 blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(204,36,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(204,36,0,1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-hf mb-4 animate-pulse-glow">
            <span className="text-3xl">🔥</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-gradient mb-2">HotFans</h1>
          <p className="text-hf-muted text-sm font-mono tracking-widest uppercase">
            Where fans get closer
          </p>
        </div>

        {/* Card */}
        <div className="bg-hf-card border border-hf-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-hf opacity-60" />

          {!sent ? (
            <>
              <h2 className="font-display text-2xl font-semibold mb-2">Welcome</h2>
              <p className="text-hf-muted text-sm mb-8">
                Enter your email and we&apos;ll send you a magic link to sign in or create your account.
              </p>

              <form onSubmit={handleMagicLink} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-hf-muted uppercase mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full bg-hf-dark border border-hf-border rounded-xl px-4 py-3 text-hf-text placeholder-hf-muted focus:border-hf-orange focus:shadow-[0_0_0_2px_rgba(255,107,0,0.15)] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-gradient-hf text-white font-display font-semibold py-3.5 rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Magic Link 🔥'}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hf-border" /></div>
                <div className="relative flex justify-center"><span className="bg-hf-card px-3 text-xs text-hf-muted">or</span></div>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('hf-guest', 'true');
                  window.location.href = '/feed';
                }}
                className="w-full py-3 bg-hf-dark border border-hf-border rounded-xl text-sm text-hf-muted hover:border-hf-orange hover:text-hf-orange transition-all font-mono"
              >
                👀 Browse as Guest
              </button>
              <p className="text-center text-xs text-hf-muted mt-6">
                No password needed. No tracking. Where fans get closer.
              </p>
            </>
          ) : (
            <div className="text-center py-4 animate-scale-in">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="font-display text-2xl font-semibold mb-2">Check your inbox</h2>
              <p className="text-hf-muted text-sm mb-6">
                We sent a magic link to{' '}
                <span className="text-hf-orange font-medium">{email}</span>.
                <br />
                Click it in the <strong>same browser</strong> — link expires in 1 hour.
              </p>
              <p className="text-xs text-hf-muted mb-4">
                New to HotFans? You'll be taken to set up your account after clicking the link.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-xs text-hf-muted hover:text-hf-orange transition-colors font-mono"
              >
                ← Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    {/* Legal footer */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-wrap justify-center gap-4 p-4 text-xs text-hf-muted/50">
        <a href="/legal/terms" className="hover:text-hf-orange transition-colors">Terms</a>
        <a href="/legal/privacy" className="hover:text-hf-orange transition-colors">Privacy</a>
        <a href="/legal/dmca" className="hover:text-hf-orange transition-colors">DMCA</a>
        <a href="/legal/2257" className="hover:text-hf-orange transition-colors">2257</a>
        <a href="/preview" className="hover:text-hf-orange transition-colors">About</a>
      </div>
    </div>
  );
}
