'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CONTENT_CATEGORIES, CONTENT_FORMATS, BODY_TYPES } from '@/lib/types';
import toast from 'react-hot-toast';

// module-level supabase
const supabase = createSupabaseBrowserClient();

const COOL_SUGGESTIONS = ['hot_lover', 'fire_vibes', 'neon_heat', 'wild_flame', 'spicy_soul'];

type Step = 'username' | 'role' | 'creator_prefs' | 'fan_prefs';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [role, setRole] = useState<'fan' | 'creator' | null>(null);
  const [loading, setLoading] = useState(false);

  // Creator prefs
  const [genderIdentity, setGenderIdentity] = useState('');
  const [contentCategories, setContentCategories] = useState<string[]>([]);
  const [contentRating, setContentRating] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState('');
  const [bodyType, setBodyType] = useState('');

  // Fan prefs
  const [interestedIn, setInterestedIn] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [preferredFormats, setPreferredFormats] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState('');
  const [showExplicit, setShowExplicit] = useState(false);

  const { user, refreshProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Wait for auth — if no user after loading, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!username || username.length < 3) { setAvailable(null); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      const { data } = await supabase.from('profiles').select('username').eq('username', username.toLowerCase()).single();
      setAvailable(!data);
      setChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, supabase]);

  const isValidUsername = (u: string) => /^[a-z0-9_]{3,20}$/.test(u);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const handleUsernameNext = async () => {
    if (!user || !username || !available) return;
    setLoading(true);

    // Insert profile WITHOUT a role — role gets set in the next step
    // We use 'fan' as the DB default but immediately overwrite in handleRoleSelect
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.toLowerCase(),
      display_name: username,
      role: 'fan', // temporary placeholder — overwritten in step 2
    });

    if (error) {
      toast.error('Could not create profile. Try a different username.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('role');
  };

  const handleRoleSelect = async (selectedRole: 'fan' | 'creator') => {
    if (!user) return;
    setRole(selectedRole);

    // Explicitly set the correct role — this is the source of truth
    const { error } = await supabase
      .from('profiles')
      .update({ role: selectedRole })
      .eq('id', user.id);

    if (error) {
      toast.error('Could not set role. Please try again.');
      return;
    }

    setStep(selectedRole === 'creator' ? 'creator_prefs' : 'fan_prefs');
  };

  const handleCreatorFinish = async () => {
    if (!user) return;
    setLoading(true);

    await supabase.from('profiles').update({
      gender_identity: genderIdentity || null,
      content_categories: contentCategories,
      content_rating: contentRating || null,
      subscription_price: subscriptionPrice ? parseFloat(subscriptionPrice) : null,
      body_type: bodyType || null,
    }).eq('id', user.id);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch('/api/stream/token', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
    }

    await refreshProfile();
    toast.success(`Welcome to HotFans, @${username}! Time to create.`);
    router.push('/creator/dashboard');
    setLoading(false);
  };

  const handleFanFinish = async () => {
    if (!user) return;
    setLoading(true);

    await supabase.from('profiles').update({
      interested_in: interestedIn,
      preferred_categories: preferredCategories,
      preferred_formats: preferredFormats,
      budget_range: budgetRange || null,
      show_explicit: showExplicit,
    }).eq('id', user.id);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch('/api/stream/token', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
    }

    await refreshProfile();
    toast.success(`Welcome to HotFans, @${username}!`);
    router.push('/discover');
    setLoading(false);
  };

  // Show spinner while auth loads
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-hf-dark flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-hf animate-pulse-glow flex items-center justify-center">
          <span className="text-2xl">🐰</span>
        </div>
      </div>
    );
  }

  const SelectButton = ({ value, current, onClick, children }: any) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
        current === value || (Array.isArray(current) && current.includes(value))
          ? 'bg-hf-red/20 border-hf-orange text-hf-orange'
          : 'bg-hf-dark border-hf-border text-hf-muted hover:border-hf-muted hover:text-hf-text'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-hf-dark flex items-center justify-center relative overflow-hidden px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-hf-red/10 blur-[100px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-hf-red/10 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-hf mb-3">
            <span className="text-2xl">🔥</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient">HotFans</h1>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {['username', 'role', step === 'creator_prefs' ? 'creator_prefs' : 'fan_prefs'].map((s, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${
              ['username', 'role', step].indexOf(s) <= ['username', 'role', step].indexOf(step)
                ? 'w-8 bg-hf-red'
                : 'w-4 bg-hf-border'
            }`} />
          ))}
        </div>

        <div className="bg-hf-card border border-hf-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-hf opacity-60" />

          {/* STEP 1: Username */}
          {step === 'username' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Pick your name</h2>
                <p className="text-hf-muted text-sm">This is how everyone will know you</p>
              </div>

              <div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hf-muted font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="your_username"
                    maxLength={20}
                    className="w-full bg-hf-dark border border-hf-border rounded-xl pl-8 pr-10 py-3 text-hf-text placeholder-hf-muted focus:border-hf-orange transition-all font-mono"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">
                    {checking && <span className="text-hf-muted animate-spin inline-block">⟳</span>}
                    {!checking && available === true && username.length >= 3 && <span className="text-green-400">✓</span>}
                    {!checking && available === false && <span className="text-red-400">✗</span>}
                  </div>
                </div>
                <div className="mt-2 text-xs font-mono">
                  {username.length >= 3 && !isValidUsername(username) && <span className="text-orange-400">Only letters, numbers, underscores</span>}
                  {isValidUsername(username) && available === false && <span className="text-red-400">@{username} is taken</span>}
                  {isValidUsername(username) && available === true && <span className="text-green-400">@{username} is available!</span>}
                </div>
              </div>

              <div>
                <p className="text-xs font-mono text-hf-muted mb-2 tracking-widest uppercase">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {COOL_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setUsername(s)}
                      className="text-xs font-mono px-3 py-1.5 rounded-lg bg-hf-dark border border-hf-border hover:border-hf-orange hover:text-hf-orange transition-all">
                      @{s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleUsernameNext}
                disabled={loading || !available || !isValidUsername(username)}
                className="w-full bg-gradient-hf text-white font-display font-semibold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all glow-red"
              >
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span> : `Claim @${username || 'username'} →`}
              </button>
            </div>
          )}

          {/* STEP 2: Role selection */}
          {step === 'role' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">How will you use HotFans?</h2>
                <p className="text-hf-muted text-sm">You can change this later in settings</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRoleSelect('creator')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-hf-border hover:border-hf-orange hover:bg-hf-red/5 transition-all group"
                >
                  <span className="text-4xl group-hover:scale-110 transition-transform">👑</span>
                  <div className="text-center">
                    <p className="font-display font-bold text-lg">Creator</p>
                    <p className="text-xs text-hf-muted mt-1">Post content, earn money, build your fanbase</p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('fan')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-hf-border hover:border-hf-orange hover:bg-hf-orange/5 transition-all group"
                >
                  <span className="text-4xl group-hover:scale-110 transition-transform">⭐</span>
                  <div className="text-center">
                    <p className="font-display font-bold text-lg">Fan</p>
                    <p className="text-xs text-hf-muted mt-1">Discover creators, subscribe, unlock exclusive content</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3A: Creator preferences */}
          {step === 'creator_prefs' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">Tell fans about yourself</h2>
                <p className="text-hf-muted text-sm">This helps fans find you and subscribe</p>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">Gender identity</label>
                <div className="flex flex-wrap gap-2">
                  {[['male', 'Male'], ['female', 'Female'], ['trans_male', 'Trans Male'], ['trans_female', 'Trans Female'], ['non_binary', 'Non-Binary'], ['other', 'Other']].map(([val, label]) => (
                    <SelectButton key={val} value={val} current={genderIdentity} onClick={setGenderIdentity}>{label}</SelectButton>
                  ))}
                </div>
              </div>

              {/* Content rating */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">Content rating</label>
                <div className="flex flex-wrap gap-2">
                  {[['softcore', 'Softcore'], ['explicit', 'Explicit'], ['fetish', 'Fetish/Kink']].map(([val, label]) => (
                    <SelectButton key={val} value={val} current={contentRating} onClick={setContentRating}>{label}</SelectButton>
                  ))}
                </div>
              </div>

              {/* Body type */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">Body type</label>
                <div className="flex flex-wrap gap-2">
                  {BODY_TYPES.map(bt => (
                    <SelectButton key={bt} value={bt} current={bodyType} onClick={setBodyType}>{bt.charAt(0).toUpperCase() + bt.slice(1)}</SelectButton>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">Content categories (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_CATEGORIES.map(cat => (
                    <SelectButton key={cat} value={cat} current={contentCategories} onClick={(v: string) => toggleItem(contentCategories, setContentCategories, v)}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectButton>
                  ))}
                </div>
              </div>

              {/* Subscription price */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">Monthly subscription price (what you receive)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hf-muted">$</span>
                  <input
                    type="number"
                    value={subscriptionPrice}
                    onChange={(e) => setSubscriptionPrice(e.target.value)}
                    placeholder="9.99"
                    min="3"
                    max="999"
                    className="w-full bg-hf-dark border border-hf-border rounded-xl pl-8 pr-4 py-3 text-hf-text placeholder-hf-muted focus:border-hf-orange transition-all"
                  />
                </div>
                {subscriptionPrice && (
                  <p className="text-xs text-hf-muted mt-1 font-mono">
                    Fans will pay <span className="text-green-400">${(parseFloat(subscriptionPrice) * 1.30).toFixed(2)}</span> per month
                  </p>
                )}
              </div>

              <button
                onClick={handleCreatorFinish}
                disabled={loading}
                className="w-full bg-gradient-hf text-white font-display font-semibold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all glow-red"
              >
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting up...</span> : 'Start Creating →'}
              </button>
            </div>
          )}

          {/* STEP 3B: Fan preferences */}
          {step === 'fan_prefs' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-1">What are you into?</h2>
                <p className="text-hf-muted text-sm">We will personalize your feed based on this</p>
              </div>

              {/* Interested in */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">I am interested in</label>
                <div className="flex flex-wrap gap-2">
                  {[['men', 'Men'], ['women', 'Women'], ['trans', 'Trans'], ['all', 'All of the above']].map(([val, label]) => (
                    <SelectButton key={val} value={val} current={interestedIn} onClick={(v: string) => toggleItem(interestedIn, setInterestedIn, v)}>{label}</SelectButton>
                  ))}
                </div>
              </div>

              {/* Content formats */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">I mostly like</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_FORMATS.map(fmt => (
                    <SelectButton key={fmt} value={fmt} current={preferredFormats} onClick={(v: string) => toggleItem(preferredFormats, setPreferredFormats, v)}>
                      {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                    </SelectButton>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">My vibe is</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_CATEGORIES.map(cat => (
                    <SelectButton key={cat} value={cat} current={preferredCategories} onClick={(v: string) => toggleItem(preferredCategories, setPreferredCategories, v)}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectButton>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-mono tracking-widest text-hf-muted uppercase block mb-2">My monthly budget</label>
                <div className="flex flex-wrap gap-2">
                  {[['free', 'Just free stuff'], ['under_20', 'Under $20'], ['20_to_50', '$20-50'], ['50_plus', '$50+'], ['unlimited', 'Sky is the limit']].map(([val, label]) => (
                    <SelectButton key={val} value={val} current={budgetRange} onClick={setBudgetRange}>{label}</SelectButton>
                  ))}
                </div>
              </div>

              {/* Explicit toggle */}
              <div className="flex items-center justify-between p-4 bg-hf-dark rounded-xl border border-hf-border">
                <div>
                  <p className="text-sm font-medium">Show explicit content</p>
                  <p className="text-xs text-hf-muted mt-0.5">You must be 18+ to enable this</p>
                </div>
                <button
                  onClick={() => setShowExplicit(!showExplicit)}
                  className={`w-12 h-6 rounded-full transition-all relative ${showExplicit ? 'bg-hf-red' : 'bg-hf-border'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${showExplicit ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              <button
                onClick={handleFanFinish}
                disabled={loading}
                className="w-full bg-gradient-hf text-white font-display font-semibold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all glow-red"
              >
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting up...</span> : 'Start Exploring →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


