'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import BlockList from '@/components/blocking/BlockList';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') { document.documentElement.classList.add('light'); setDarkMode(false); }
    if (user) { fetchSubscriptions(); fetchPurchases(); }
  }, [user]);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
    setDarkMode(!darkMode);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, creator:profiles!subscriptions_creator_id_fkey(id, username, avatar_url)')
      .eq('fan_id', user!.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('ppv_purchases')
      .select('*, creator:profiles!ppv_purchases_creator_id_fkey(username)')
      .eq('fan_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setPurchases(data || []);
  };

  const handleCancelSub = async (creatorId: string, username: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/payments/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session?.access_token },
      body: JSON.stringify({ creatorId }),
    });
    const data = await res.json();
    if (data.success) { toast.success(`Cancelled @${username}`); fetchSubscriptions(); }
    else toast.error('Could not cancel');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <h1 className="font-display text-2xl font-bold mb-6 text-gradient">Settings</h1>

      {/* Theme */}
      <div className="bg-hf-card border border-hf-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Appearance</h3>
            <p className="text-xs text-hf-muted mt-0.5">{darkMode ? '🌙 Dark mode' : '☀️ Light mode'}</p>
          </div>
          <button onClick={toggleTheme} className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-hf-red' : 'bg-hf-orange'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="bg-hf-card border border-hf-border rounded-2xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-4">🔥 Active Subscriptions</h3>
        {!subscriptions.length ? (
          <p className="text-hf-muted text-sm">No active subscriptions</p>
        ) : subscriptions.map(sub => (
          <div key={sub.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-hf overflow-hidden flex items-center justify-center text-white font-bold">
                {sub.creator?.avatar_url ? <img src={sub.creator.avatar_url} alt="" className="w-full h-full object-cover" /> : sub.creator?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">@{sub.creator?.username}</p>
                <p className="text-xs text-hf-muted">${(sub.fan_paid || 0).toFixed(2)}/mo</p>
              </div>
            </div>
            <button onClick={() => handleCancelSub(sub.creator_id, sub.creator?.username)} className="text-xs text-hf-muted hover:text-red-400 transition-colors font-mono">Cancel</button>
          </div>
        ))}
      </div>

      {/* Purchase History */}
      <div className="bg-hf-card border border-hf-border rounded-2xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-4">💰 Purchase History</h3>
        {!purchases.length ? (
          <p className="text-hf-muted text-sm">No purchases yet</p>
        ) : purchases.map(p => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b border-hf-border/50 last:border-0">
            <div>
              <p className="text-sm">PPV from @{p.creator?.username}</p>
              <p className="text-xs text-hf-muted">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <p className="text-sm font-bold text-hf-orange">${(p.fan_paid || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Block List */}
      <div className="bg-hf-card border border-hf-border rounded-2xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-4">🚫 Blocked Users</h3>
        <BlockList />
      </div>

      {/* Sign Out */}
      <div className="bg-hf-card border border-hf-border rounded-2xl p-5">
        <button onClick={signOut} className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-semibold hover:bg-red-500/20 transition-all">
          Sign Out
        </button>
      </div>
    </div>
  );
}
