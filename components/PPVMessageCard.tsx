'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();
import toast from 'react-hot-toast';

interface PPVAttachment {
  type: 'ppv';
  post_id: string;
  title: string;
  price: number;
  thumbnail_url?: string;
  media_url?: string;
  media_type: 'video' | 'image';
  duration?: string;
  media_count?: number;
}

interface PPVMessageCardProps {
  attachment: PPVAttachment;
  isCreator: boolean;
  onPurchase?: (postId: string) => void;
}

export function PPVMessageCard({ attachment, isCreator, onPurchase }: PPVMessageCardProps) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  // Check if already purchased on mount
  useEffect(() => {
    const check = async () => {
    const isUpload = attachment.post_id.startsWith('upload_');
    const query = supabase.from('ppv_purchases').select('id').eq('fan_id', user.id).eq('status', 'completed');
    const { data } = isUpload
      ? await query.eq('ccbill_transaction_id', attachment.post_id).maybeSingle()
      : await query.eq('post_id', attachment.post_id).maybeSingle();
      if (data) setUnlocked(true);
    };
    check();
  }, [user, attachment.post_id]);
  const [purchasing, setPurchasing] = useState(false);

  const price = (attachment.price / 100).toFixed(2);
  const isVideo = attachment.media_type === 'video';
  const isMultiPhoto = !isVideo && (attachment.media_count || 1) > 1;
  const showThumbnail = (isVideo || isMultiPhoto) && !!attachment.thumbnail_url;

  const handlePurchase = async () => {
    if (!user) { toast.error('Please log in'); return; }
    setPurchasing(true);
    try {
      console.log('[PPV] attempting purchase, user:', user.id, 'post_id:', attachment.post_id);
      const postId = attachment.post_id.startsWith('upload_') ? null : attachment.post_id;
      const { error: dbError } = postId
        ? await supabase.from('ppv_purchases').upsert({ fan_id: user.id, post_id: postId, status: 'completed' }, { onConflict: 'fan_id,post_id' })
        : await supabase.from('ppv_purchases').insert({ fan_id: user.id, post_id: null, ccbill_transaction_id: attachment.post_id, status: 'completed' });
      if (dbError) console.error('[PPV] db error:', dbError);
      toast.success(`Unlocked for $${price}! 🎉`);
      setUnlocked(true);
      onPurchase?.(attachment.post_id);
    } catch (err) {
      console.error('[PPV] purchase error:', err);
      toast.error('Could not unlock');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden border border-bunni-pink/30 bg-bunni-dark"
      style={{ width: 300, boxShadow: '0 0 20px rgba(255,45,138,0.12)' }}
    >
      {/* Unlocked video — full width with native controls */}
      {unlocked && isVideo && attachment.media_url ? (
        <div className="relative">
          <video
            src={attachment.media_url}
            controls
            playsInline
            autoPlay
            className="w-full rounded-t-2xl"
            style={{ maxHeight: 200 }}
          />
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-bold text-bunni-text truncate">{attachment.title}</p>
            <span className="text-green-400 text-xs font-bold ml-2">✓</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-row">
          {/* Left: thumbnail / lock */}
          <div className="relative flex-shrink-0 bg-bunni-card overflow-hidden" style={{ width: 100, minHeight: 100 }}>
            {unlocked && attachment.thumbnail_url ? (
              <img src={attachment.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                {showThumbnail && (
                  <img src={attachment.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 ${showThumbnail ? 'bg-black/15' : 'bg-bunni-card'}`}>
                  <span className="text-2xl">🔒</span>
                  <span className="text-white text-[9px] font-mono font-bold text-center px-1 leading-tight">
                    {isVideo ? 'Video' : isMultiPhoto ? `${attachment.media_count} Photos` : 'Photo'}
                  </span>
                </div>
              </>
            )}
            <div className="absolute top-1.5 left-1.5 bg-bunni-pink text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
              💎
            </div>
          </div>

          {/* Right: info + action */}
          <div className="flex flex-col justify-between p-3 flex-1 min-w-0">
            <div>
              <p className="text-xs font-bold text-bunni-text truncate mb-0.5">{attachment.title}</p>
              <p className="text-bunni-pink font-bold font-mono text-sm">${price}</p>
              {isCreator && <p className="text-[10px] text-bunni-muted font-mono mt-0.5">Your PPV</p>}
            </div>
            {!isCreator && (
              <div className="mt-2">
                {unlocked ? (
                  <span className="text-green-400 text-xs font-bold">✓ Unlocked</span>
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full py-1.5 bg-gradient-bunni text-white text-[11px] font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-1"
                  >
                    {purchasing ? (
                      <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Unlocking...</>
                    ) : (
                      <>💎 Unlock for ${price}</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
