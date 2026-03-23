'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UploadedMedia, PostVisibility, calculateFanPrice } from '@/lib/types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// module-level supabase
const supabase = createSupabaseBrowserClient();

interface PostComposerProps {
  onPost?: () => void;
}

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: string; desc: string; color: string }[] = [
  { value: 'free', label: 'Free', icon: '🌍', desc: 'Anyone can see', color: 'border-bunni-lime text-bunni-lime bg-bunni-lime/10' },
  { value: 'subscribers', label: 'Subscribers', icon: '⭐', desc: 'Active subs only', color: 'border-bunni-purple text-bunni-purple bg-bunni-purple/10' },
  { value: 'ppv', label: 'Pay Per View', icon: '💎', desc: 'One time purchase', color: 'border-bunni-pink text-bunni-pink bg-bunni-pink/10' },
];

export default function PostComposer({ onPost }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>('subscribers');
  const [ppvPrice, setPpvPrice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, user } = useAuth();

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;
    const newFiles = Array.from(files).slice(0, 4 - media.length);
    if (newFiles.length === 0) return;
    setUploading(true);

    for (const file of newFiles) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isVideo) { toast.error('Only images and videos supported'); continue; }
      if (file.size > 50 * 1024 * 1024) { toast.error('Files must be under 50MB'); continue; }

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${uuidv4()}.${ext}`;

      const { error, data } = await supabase.storage.from('posts').upload(path, file, { upsert: false });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(data.path);
      setMedia(prev => [...prev, { url: urlData.publicUrl, type: isVideo ? 'video' : 'image', file }]);
    }
    setUploading(false);
  }, [media.length, user, supabase]);

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) return;
    if (!user) return;
    if (visibility === 'ppv' && (!ppvPrice || parseFloat(ppvPrice) <= 0)) {
      toast.error('Set a price for pay-per-view content');
      return;
    }
    setPosting(true);

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim() || null,
      media_urls: media.map(m => m.url),
      media_types: media.map(m => m.type),
      visibility,
      ppv_price: visibility === 'ppv' ? parseFloat(ppvPrice) : null,
    });

    if (error) { toast.error('Could not post. Try again.'); setPosting(false); return; }

    setContent('');
    setMedia([]);
    setPpvPrice('');
    setVisibility('subscribers');
    toast.success('Posted! ✨');
    onPost?.();
    setPosting(false);
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility)!;

  return (
    <div className="bg-bunni-card border border-bunni-border rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-bunni opacity-40" />

      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-bunni flex-shrink-0">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.username} width={40} height={40} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {profile?.username[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with your fans... ✨"
            rows={3}
            maxLength={1000}
            className="w-full bg-transparent text-bunni-text placeholder-bunni-muted resize-none text-base leading-relaxed focus:outline-none"
          />

          {/* Media previews */}
          {media.length > 0 && (
            <div className={`grid gap-2 mt-3 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {media.map((m, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-bunni-dark aspect-square group">
                  {m.type === 'image' ? (
                    <Image src={m.url} alt="" fill className="object-cover" />
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" muted />
                  )}
                  <button
                    onClick={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                  >✕</button>
                  {m.type === 'video' && (
                    <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded-full font-mono">VIDEO</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 mt-3 text-bunni-muted text-sm">
              <span className="w-3 h-3 border border-bunni-pink/50 border-t-bunni-pink rounded-full animate-spin" />
              Uploading media...
            </div>
          )}

          {/* Visibility selector */}
          <div className="mt-4">
            <p className="text-xs font-mono tracking-widest text-bunni-muted uppercase mb-2">Who can see this?</p>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    visibility === opt.value ? opt.color : 'border-bunni-border text-bunni-muted hover:border-bunni-muted'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PPV price input */}
          {visibility === 'ppv' && (
            <div className="mt-3 animate-slide-up">
              <label className="text-xs font-mono tracking-widest text-bunni-muted uppercase block mb-2">Your price (what you receive)</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bunni-muted">$</span>
                  <input
                    type="number"
                    value={ppvPrice}
                    onChange={(e) => setPpvPrice(e.target.value)}
                    placeholder="9.99"
                    min="1"
                    className="w-full bg-bunni-dark border border-bunni-pink/30 rounded-xl pl-8 pr-4 py-2.5 text-bunni-text placeholder-bunni-muted focus:border-bunni-pink transition-all text-sm"
                  />
                </div>
                {ppvPrice && parseFloat(ppvPrice) > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-bunni-muted">Fan pays</p>
                    <p className="text-bunni-lime font-mono font-bold">${calculateFanPrice(parseFloat(ppvPrice)).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-bunni-border">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={media.length >= 4 || uploading}
                className="flex items-center gap-1.5 text-sm text-bunni-muted hover:text-bunni-pink transition-colors disabled:opacity-40 px-3 py-1.5 rounded-lg hover:bg-bunni-pink/10"
              >
                <span>🖼️</span>
                <span className="font-mono text-xs">Photo/Video</span>
              </button>
              {content.length > 0 && <span className="text-xs font-mono text-bunni-muted">{content.length}/1000</span>}
            </div>

            <button
              onClick={handlePost}
              disabled={(!content.trim() && media.length === 0) || posting}
              className="bg-gradient-bunni text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all"
            >
              {posting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  Posting
                </span>
              ) : `Post as ${selectedVisibility.icon} ${selectedVisibility.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
