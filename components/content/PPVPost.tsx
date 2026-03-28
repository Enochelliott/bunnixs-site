'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

interface Props {
  post: any;
  onPurchased?: (urls: string[]) => void;
}

export default function PPVPost({ post, onPurchased }: Props) {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(post.is_purchased || false);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  const isOwner = user?.id === post.user_id;
  const price = post.ppv_price || 0;
  const fanPrice = (price * 1.30).toFixed(2);
  const creatorUsername = post.profile?.username || 'creator';

  // Clip URL — first video in media_urls is the teaser clip
  const clipUrl = post.clip_url || post.media_urls?.find((u: string) => u.match(/\.(mp4|mov|webm)/i));
  const mediaUrls = post.media_urls || [];

  const handlePurchase = async () => {
    if (!user) { toast.error('Please log in'); return; }
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/ppv-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session?.access_token,
        },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPurchased(true);
        setSignedUrls(data.urls || []);
        onPurchased?.(data.urls || []);
        toast.success('Unlocked! Enjoy 🔥');
      } else {
        toast.error(data.error || 'Could not unlock');
      }
    } catch {
      toast.error('Could not unlock');
    }
    setPurchasing(false);
  };

  // Owner or purchased — show full content
  if (isOwner || purchased) {
    const urls = signedUrls.length ? signedUrls : mediaUrls;
    return (
      <div className="space-y-2">
        {urls.map((url: string, i: number) => (
          post.media_types?.[i] === 'image' ? (
            <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image src={url} alt="" fill className="object-cover" sizes="600px" />
            </div>
          ) : (
            <video key={i} src={url} controls className="w-full rounded-xl" />
          )
        ))}
        {isOwner && (
          <div className="px-4 pb-2">
            <p className="text-xs text-hf-muted font-mono">💎 PPV · ${price.toFixed(2)} · fans pay ${fanPrice}</p>
          </div>
        )}
      </div>
    );
  }

  // Fan — show teaser clip (no lock) + pay button
  return (
    <div className="relative overflow-hidden">
      {/* Teaser clip plays normally */}
      {clipUrl ? (
        <video
          src={clipUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full"
          style={{ maxHeight: '480px', objectFit: 'cover' }}
        />
      ) : (
        // Fallback if no clip — blurred thumbnail
        <div className="aspect-[4/3] bg-hf-dark flex items-center justify-center">
          <p className="text-4xl">🔥</p>
        </div>
      )}

      {/* Pay button at bottom */}
      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className="w-full py-3.5 font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #CC2400, #FF6B00)' }}
      >
        {purchasing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>🔥 Pay ${fanPrice} and enjoy @{creatorUsername}'s full video</>
        )}
      </button>
    </div>
  );
}
