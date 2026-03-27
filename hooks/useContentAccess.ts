'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface ContentAccessResult {
  canView: boolean;
  reason: 'free' | 'owner' | 'subscribed' | 'purchased' | 'locked_sub' | 'locked_ppv' | 'loading';
  loading: boolean;
  signedUrls: string[];
  refetch: () => Promise<void>;
}

export function useContentAccess(
  postId: string,
  postOwnerId: string,
  visibility: 'free' | 'subscribers' | 'ppv',
  mediaUrls: string[] = []
): ContentAccessResult {
  const { user } = useAuth();
  const [canView, setCanView] = useState(false);
  const [reason, setReason] = useState<ContentAccessResult['reason']>('loading');
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<string[]>(mediaUrls);

  const checkAccess = useCallback(async () => {
    if (!postId) { setLoading(false); return; }

    // Free content — always accessible
    if (visibility === 'free') {
      setCanView(true);
      setReason('free');
      setSignedUrls(mediaUrls);
      setLoading(false);
      return;
    }

    // Owner always sees own content
    if (user?.id === postOwnerId) {
      setCanView(true);
      setReason('owner');
      setSignedUrls(mediaUrls);
      setLoading(false);
      return;
    }

    if (!user) {
      setCanView(false);
      setReason(visibility === 'subscribers' ? 'locked_sub' : 'locked_ppv');
      setLoading(false);
      return;
    }

    if (visibility === 'subscribers') {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('fan_id', user.id)
        .eq('creator_id', postOwnerId)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        // Get signed URLs from server
        const res = await fetch('/api/content/' + postId);
        const json = await res.json();
        setCanView(true);
        setReason('subscribed');
        setSignedUrls(json.urls || mediaUrls);
      } else {
        setCanView(false);
        setReason('locked_sub');
      }
    } else if (visibility === 'ppv') {
      const { data } = await supabase
        .from('ppv_purchases')
        .select('id')
        .eq('fan_id', user.id)
        .eq('post_id', postId)
        .eq('status', 'completed')
        .maybeSingle();

      if (data) {
        const res = await fetch('/api/content/' + postId);
        const json = await res.json();
        setCanView(true);
        setReason('purchased');
        setSignedUrls(json.urls || mediaUrls);
      } else {
        setCanView(false);
        setReason('locked_ppv');
      }
    }

    setLoading(false);
  }, [postId, postOwnerId, visibility, user]);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  return { canView, reason, loading, signedUrls, refetch: checkAccess };
}
