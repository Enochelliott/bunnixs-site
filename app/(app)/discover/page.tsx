'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, calculateFanPrice } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

const supabase = createSupabaseBrowserClient();

const DISCOVER_CATEGORIES = [
  'all', 'glamour', 'natural', 'amateur', 'cosplay', 'fantasy',
  'fetish', 'kink', 'artistic', 'fitness', 'lifestyle',
  'curvy', 'petite', 'bbw', 'milf', 'ebony', 'latina',
  'asian', 'redhead', 'blonde', 'brunette',
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: '🆕 Newest' },
  { value: 'top', label: '🔥 Top Sellers' },
  { value: 'frequent', label: '⚡ Most Active' },
  { value: 'exclusive', label: '💎 Exclusive' },
  { value: 'free', label: '🌍 Free' },
  { value: 'price_low', label: '💸 Budget' },
  { value: 'verified', label: '✓ Verified' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['value'];

export default function DiscoverPage() {
  const { user, profile } = useAuth();
  const [creators, setCreators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSort, setActiveSort] = useState<SortOption>('newest');

  const fetchCreators = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'creator')
      .eq('is_banned', false)
      .neq('id', user?.id || '');

    if (searchQuery.trim()) {
      query = query.ilike('username', `%${searchQuery.trim()}%`);
    }

    if (activeCategory !== 'all') {
      query = query.or(
        `content_categories.cs.{${activeCategory}},body_type.eq.${activeCategory},ethnicity.eq.${activeCategory}`
      );
    }

    switch (activeSort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_low':
        query = query.not('subscription_price', 'is', null).order('subscription_price', { ascending: true });
        break;
      case 'free':
        query = query.is('subscription_price', null);
        break;
      case 'verified':
        query = query.eq('is_verified_creator', true);
        break;
      case 'exclusive':
        query = query.in('content_rating', ['explicit', 'fetish']);
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    if (!searchQuery.trim()) {
      if (!profile.show_explicit) {
        query = query.or('content_rating.eq.softcore,content_rating.is.null');
      }
      if (profile.budget_range && profile.budget_range !== 'unlimited' && activeSort !== 'free') {
        const budgetMap: Record<string, number> = { free: 0, under_20: 20, '20_to_50': 50, '50_plus': 999 };
        const maxBudget = budgetMap[profile.budget_range];
        if (maxBudget > 0) {
          query = query.or(`subscription_price.lte.${maxBudget / 1.30},subscription_price.is.null`);
        }
      }
    }

    const { data } = await query.limit(60);
    setCreators((data || []) as Profile[]);
    setLoading(false);
  }, [profile, user, searchQuery, activeCategory, activeSort]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchCreators(); }, searchQuery ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchCreators, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold"><span className="text-gradient">Discover</span></h1>
        <p className="text-bunni-muted text-sm mt-1">Find your favorite creators</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bunni-muted">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full bg-bunni-card border border-bunni-border rounded-2xl pl-11 pr-10 py-3.5 text-bunni-text placeholder-bunni-muted focus:border-bunni-pink focus:shadow-[0_0_0_2px_rgba(255,45,138,0.15)] transition-all font-mono"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-bunni-muted hover:text-bunni-text text-sm">✕</button>
        )}
      </div>

      {/* Sort */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setActiveSort(opt.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeSort === opt.value
                ? 'bg-bunni-pink/15 border-bunni-pink text-bunni-pink'
                : 'bg-bunni-card border-bunni-border text-bunni-muted hover:border-bunni-muted hover:text-bunni-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: 'none' }}>
        {DISCOVER_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all capitalize ${
              activeCategory === cat
                ? 'bg-bunni-purple/15 border-bunni-purple text-bunni-purple'
                : 'bg-bunni-card border-bunni-border text-bunni-muted hover:border-bunni-muted'
            }`}
          >
            {cat === 'all' ? '✦ All' : cat}
          </button>
        ))}
      </div>

      {!loading && (
        <p className="text-xs text-bunni-muted font-mono mb-4">
          {creators.length === 0 ? 'No creators found' : `${creators.length} creator${creators.length !== 1 ? 's' : ''}`}
          {searchQuery && ` for "${searchQuery}"`}
          {activeCategory !== 'all' && ` in ${activeCategory}`}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-bunni-card border border-bunni-border rounded-2xl overflow-hidden">
              <div className="h-28 shimmer" />
              <div className="p-4 space-y-2">
                <div className="w-20 h-3 rounded shimmer" />
                <div className="w-28 h-2 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🐰</div>
          <h3 className="font-display text-xl font-semibold mb-2">No creators found</h3>
          <p className="text-bunni-muted text-sm mb-4">{searchQuery ? `No one found matching "${searchQuery}"` : 'Try a different category or filter'}</p>
          <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); setActiveSort('newest'); }} className="text-xs text-bunni-pink font-mono hover:underline">
            Clear all filters →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {creators.map(creator => (
            <Link
              key={creator.id}
              href={`/creator/${creator.username}`}
              className="bg-bunni-card border border-bunni-border rounded-2xl overflow-hidden hover:border-bunni-pink/50 hover:shadow-[0_0_20px_rgba(255,45,138,0.08)] transition-all group animate-fade-in"
            >
              <div className="relative h-28 bg-gradient-to-br from-bunni-purple/20 to-bunni-pink/20 overflow-hidden">
                {creator.cover_url && (
                  <Image src={creator.cover_url} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                {creator.is_verified_creator && (
                  <div className="absolute top-2 right-2 bg-bunni-pink/90 text-white text-xs px-1.5 py-0.5 rounded-full font-mono">✓</div>
                )}
                <div className="absolute -bottom-5 left-3 w-11 h-11 rounded-xl overflow-hidden border-2 border-bunni-card bg-gradient-bunni shadow-lg">
                  {creator.avatar_url ? (
                    <Image src={creator.avatar_url} alt={creator.username} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                      {creator.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-7 px-3 pb-4">
                <p className="font-semibold text-sm truncate">@{creator.username}</p>
                {creator.bio && <p className="text-xs text-bunni-muted mt-0.5 line-clamp-2">{creator.bio}</p>}
                {creator.content_categories && creator.content_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {creator.content_categories.slice(0, 2).map(cat => (
                      <span key={cat} className="text-xs bg-bunni-border text-bunni-muted px-1.5 py-0.5 rounded-full font-mono capitalize">{cat}</span>
                    ))}
                    {creator.content_categories.length > 2 && (
                      <span className="text-xs text-bunni-muted font-mono">+{creator.content_categories.length - 2}</span>
                    )}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-bunni-border">
                  {creator.subscription_price ? (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-bunni-muted">Subscribe</p>
                      <p className="font-display font-bold text-bunni-pink text-sm">${calculateFanPrice(creator.subscription_price).toFixed(2)}/mo</p>
                    </div>
                  ) : (
                    <p className="text-xs text-bunni-lime font-mono">🌍 Free to follow</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
