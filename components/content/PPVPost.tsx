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
  const { user, profile } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(post.is_purchased || false);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  const isOwner = user?.id === post.user_id;
  const thumbnail = post.thumbnail_url || post.media_urls?.[0];
  const price = post.ppv_price || 0;
  const fanPrice = (price * 1.30).toFixed(2);

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

  // Owner sees their own content
  if (isOwner || purchased) {
    const urls = signedUrls.length ? signedUrls : post.media_urls || [];
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
      </div>
    );
  }

  // Locked PPV — show thumbnail with lock overlay
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred thumbnail */}
      <div className="relative aspect-[4/3]">
        {thumbnail ? (
          <div className="relative w-full h-full">
            <Image
              src={thumbnail}
              alt=""
              fill
              className="object-cover blur-md scale-105"
              sizes="600px"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-hf-red/20 to-hf-orange/20 flex items-center justify-center">
            <span className="text-6xl">🔥</span>
          </div>
        )}

        {/* Lock icon center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-white font-bold text-sm text-center px-4">
            Exclusive content by @{post.profile?.username || 'creator'}
          </p>
        </div>
      </div>

      {/* Purchase button */}
      <button
        onClick={handlePurchase}
        disabled={purchasing || !user}
        className="w-full py-4 bg-gradient-to-r from-hf-red to-hf-orange text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
      >
        {purchasing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Unlocking...
          </>
        ) : (
          <>
            🔥 Pay ${fanPrice} and enjoy @{post.profile?.username || 'creator'}'s new video
          </>
        )}
      </button>
    </div>
  );
}
