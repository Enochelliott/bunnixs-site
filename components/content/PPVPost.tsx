'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import CommentSection from '@/components/CommentSection';
import EmojiReactions from '@/components/EmojiReactions';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const isOwner = user?.id === post.user_id;
  const price = post.ppv_price || 0;
  const fanPrice = (price * 1.30).toFixed(2);
  const creatorUsername = post.profile?.username || 'creator';

  const videoUrl = post.media_urls?.find((u: string) => u.match(/\.(mp4|mov|webm)/i)) || post.media_urls?.[0];
  const clipStart = post.clip_start ?? 0;
  const clipDuration = post.clip_duration ?? null;

  // Seek to clip start when video loads and loop the clip
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipDuration || isOwner || purchased) return;

    const handleLoaded = () => {
      video.currentTime = clipStart;
      video.play().catch(() => {});
    };

    const handleTimeUpdate = () => {
      if (clipDuration && video.currentTime >= clipStart + clipDuration) {
        video.currentTime = clipStart;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [clipStart, clipDuration, isOwner, purchased]);

  const handlePurchase = async () => {
    if (!user) { toast.error('Please log in'); return; }
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payments/ppv-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session?.access_token },
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
    } catch { toast.error('Could not unlock'); }
    setPurchasing(false);
  };

  // Owner or purchased — show full content
  if (isOwner || purchased) {
    const urls = signedUrls.length ? signedUrls : post.media_urls || [];
    return (
      <div>
        {/* Post text */}
        {post.content && <div className="px-5 pb-3"><p className="text-hf-text leading-relaxed">{post.content}</p></div>}
        <div className="space-y-2">
          {urls.map((url: string, i: number) => (
            post.media_types?.[i] === 'image' ? (
              <div key={i} className="relative aspect-[4/3]"><Image src={url} alt="" fill className="object-cover" sizes="600px" /></div>
            ) : (
              <video key={i} src={url} controls controlsList="nodownload" disablePictureInPicture className="w-full" />
            )
          ))}
        </div>
        {isOwner && <div className="px-5 py-2"><p className="text-xs text-hf-muted font-mono">💎 PPV · ${price.toFixed(2)} · fans pay ${fanPrice}</p></div>}
        <div className="px-5 pb-3"><EmojiReactions targetId={post.id} targetType="post" postOwnerId={post.user_id} /></div>
        <CommentSection postId={post.id} postOwnerId={post.user_id} />
      </div>
    );
  }

  // Fan — show teaser clip looping at clip range + pay button + comments
  return (
    <div>
      {/* Post text */}
      {post.content && <div className="px-5 pb-3"><p className="text-hf-text leading-relaxed">{post.content}</p></div>}

      {/* Teaser clip */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          loop={!clipDuration}
          className="w-full"
          style={{ maxHeight: '480px', objectFit: 'cover' }}
        />
      ) : (
        <div className="aspect-[4/3] bg-hf-dark flex items-center justify-center"><p className="text-4xl">🔥</p></div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className="w-full py-3.5 font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #CC2400, #FF6B00)' }}
      >
        {purchasing ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
        ) : (
          <>🔥 Pay ${fanPrice} and enjoy @{creatorUsername}'s full video</>
        )}
      </button>

      {/* Reactions + Comments visible to all */}
      <div className="px-5 pt-3 pb-1"><EmojiReactions targetId={post.id} targetType="post" postOwnerId={post.user_id} /></div>
      <CommentSection postId={post.id} postOwnerId={post.user_id} />
    </div>
  );
}
