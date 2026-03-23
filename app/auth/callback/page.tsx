'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const supabase = createSupabaseBrowserClient();

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorParam = searchParams.get('error') || hashParams.get('error');

        if (errorParam) {
          setError('Link expired. Redirecting...');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single();

        if (!profile) {
          router.push('/onboarding');
        } else if (profile.role === 'creator') {
          router.push('/creator/dashboard');
        } else {
          router.push('/discover');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Something went wrong. Redirecting...');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-bunni-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-bunni animate-pulse-glow flex items-center justify-center">
          <span className="text-3xl">&#128048;</span>
        </div>
        {error ? (
          <p className="text-red-400 font-mono text-sm">{error}</p>
        ) : (
          <>
            <div className="w-6 h-6 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
            <p className="font-display text-xl font-bold text-gradient">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
}
