'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
const supabase = createSupabaseBrowserClient();
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorParam = searchParams.get('error') || hashParams.get('error');
        if (errorParam) { setStatus('error'); setTimeout(() => router.push('/'), 2000); return; }
        if (code) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) throw error; }
        else if (accessToken && refreshToken) { const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }); if (error) throw error; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }
        setStatus('success');
        const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single();
        await new Promise(r => setTimeout(r, 600));
        if (!profile) { router.push('/onboarding'); }
        else if (profile.role === 'creator') { router.push('/creator/dashboard'); }
        else { router.push('/feed'); }
      } catch (err) { console.error('Callback error:', err); setStatus('error'); setTimeout(() => router.push('/'), 2000); }
    };
    handleCallback();
  }, [router]);
  return (
    <div className="min-h-screen bg-hf-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-hf flex items-center justify-center animate-pulse-glow">
          <span className="text-3xl">🔥</span>
        </div>
        {status === 'loading' && (<><div className="w-6 h-6 border-2 border-hf-orange/30 border-t-hf-orange rounded-full animate-spin" /><p className="font-display text-xl font-bold text-gradient">Signing you in...</p></>)}
        {status === 'success' && (<><div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center"><span className="text-white font-bold">✓</span></div><p className="font-display text-xl font-bold text-gradient">Welcome back! 🔥</p></>)}
        {status === 'error' && (<p className="text-red-400 font-mono text-sm">Link expired — redirecting...</p>)}
      </div>
    </div>
  );
}
