'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const supabase = createSupabaseBrowserClient();

interface Props {
  onPost?: () => void;
}

type Visibility = 'free' | 'subscribers' | 'ppv';

const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.currentTime = 1;
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    video.onerror = reject;
  });
};

const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

import PPVClipTrimmer from './PPVClipTrimmer';

export default function PostComposer({ onPost }: Props) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('free');
  const [ppvPrice, setPpvPrice] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipDuration, setClipDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const cancelRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles(arr);
    // Auto-show trimmer if PPV is already selected and we have a video
    const hasVideo = arr.some(f => f.type.startsWith('video/'));
    if (hasVideo && visibility === 'ppv') { setShowTrimmer(true); }
    cancelRef.current = false;
    setCancelled(false);

    const previewUrls: string[] = [];
    let thumbDataUrl: string | null = null;

    for (const f of arr) {
      if (f.type.startsWith('image/')) {
        previewUrls.push(URL.createObjectURL(f));
      } else if (f.type.startsWith('video/')) {
        const objUrl = URL.createObjectURL(f);
        previewUrls.push(objUrl);
        // Auto-generate thumbnail
        try {
          thumbDataUrl = await generateThumbnail(f);
          setThumbnailDataUrl(thumbDataUrl);
          toast.success('Thumbnail generated! 📸');
        } catch {
          console.log('Thumbnail generation failed');
        }
      }
    }
    setPreviews(previewUrls);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setCancelled(true);
    setUploading(false);
    setUploadProgress(0);
    toast('Upload cancelled');
  };

  const handlePost = async () => {
    if (!user || !profile) return;
    if (!content.trim() && files.length === 0) {
      toast.error('Add some content first');
      return;
    }
    if (!profile.is_verified_creator) {
      toast.error('You need to verify your identity before posting');
      return;
    }
    if (visibility === 'ppv' && (!ppvPrice || parseFloat(ppvPrice) <= 0)) {
      toast.error('Set a price for PPV content');
      return;
    }

    setUploading(true);
    cancelRef.current = false;
    setUploadProgress(0);

    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      let thumbnailUrl: string | null = null;

      // Upload thumbnail if we have one
      if (thumbnailDataUrl && files.some(f => f.type.startsWith('video/'))) {
        const thumbBlob = dataURLtoBlob(thumbnailDataUrl);
        const thumbPath = `${user.id}/thumb_${Date.now()}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('posts')
          .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });
        if (!thumbError) {
          const { data: thumbData } = supabase.storage.from('posts').getPublicUrl(thumbPath);
          thumbnailUrl = thumbData.publicUrl;
        }
      }

      // Upload media files
      for (let i = 0; i < files.length; i++) {
        if (cancelRef.current) break;
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${i}.${ext}`;
        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100));

        const { error } = await supabase.storage.from('posts').upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        if (cancelRef.current) break;

        const { data } = supabase.storage.from('posts').getPublicUrl(path);
        mediaUrls.push(data.publicUrl);
        mediaTypes.push(file.type.startsWith('image/') ? 'image' : 'video');
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      if (cancelRef.current) {
        setUploading(false);
        setUploadProgress(0);
        return;
      }

      // Create post
      const { error: postError } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim() || null,
        visibility,
        ppv_price: visibility === 'ppv' ? parseFloat(ppvPrice) : null,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        thumbnail_url: thumbnailUrl,
      });

      if (postError) throw postError;

      // Notify subscribers of new post (for non-free posts)
      if (visibility !== 'free') {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('fan_id')
          .eq('creator_id', user.id)
          .eq('status', 'active');

        if (subs?.length) {
          const notifications = subs.map(s => ({
            user_id: s.fan_id,
            type: 'new_post',
            title: '✨ New Post',
            body: `@${profile.username} just posted new ${visibility === 'ppv' ? 'PPV' : 'exclusive'} content`,
            actor_id: user.id,
            target_type: 'post',
            read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast.success('Posted! 🔥');
      setContent('');
      setFiles([]);
      setPreviews([]);
      setThumbnailDataUrl(null);
      setPpvPrice('');
      setVisibility('free');
      setUploading(false);
      setUploadProgress(0);
      onPost?.();
    } catch (err) {
      console.error('Post error:', err);
      toast.error('Could not post. Try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVisibilityChange = (v: Visibility) => {
    setVisibility(v);
    const hasVideo = files.some(f => f.type.startsWith('video/'));
    if (v === 'ppv' && hasVideo) setShowTrimmer(true);
  };

  const visibilityOptions: { value: Visibility; label: string; color: string }[] = [
    { value: 'free', label: '🌍 Free', color: 'text-green-400 border-green-400/40 bg-green-400/10' },
    { value: 'subscribers', label: '⭐ Subs Only', color: 'text-hf-orange border-hf-orange/40 bg-hf-orange/10' },
    { value: 'ppv', label: '💎 PPV', color: 'text-hf-red border-hf-red/40 bg-hf-red/10' },
  ];

  const videoFile = files.find(f => f.type.startsWith('video/'));
  const videoPreviewUrl = videoFile ? previews[files.indexOf(videoFile)] : null;

  return (
    <>
    {showTrimmer && videoFile && videoPreviewUrl && (
      <PPVClipTrimmer
        videoUrl={videoPreviewUrl}
        onConfirm={(start, clipLen) => {
          setClipStart(start);
          setClipDuration(clipLen);
          setShowTrimmer(false);
        }}
        onClose={() => setShowTrimmer(false)}
      />
    )}
    <div className="bg-hf-card border border-hf-border rounded-2xl p-5 mb-6">
      {/* Text input */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind? 🔥"
        rows={3}
        maxLength={2000}
        className="w-full bg-transparent text-hf-text placeholder:text-hf-muted resize-none focus:outline-none text-sm leading-relaxed"
      />

      {/* Media previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {previews.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-hf-dark">
              {files[i]?.type.startsWith('image/') ? (
                <Image src={url} alt="" fill className="object-cover" sizes="80px" />
              ) : (
                <video src={url} className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => {
                  setFiles(prev => prev.filter((_, j) => j !== i));
                  setPreviews(prev => prev.filter((_, j) => j !== i));
                  if (files[i]?.type.startsWith('video/')) setThumbnailDataUrl(null);
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500 transition-all"
              >
                ✕
              </button>
            </div>
          ))}
          {/* Thumbnail preview */}
          {thumbnailDataUrl && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-hf-orange">
              <Image src={thumbnailDataUrl} alt="thumbnail" fill className="object-cover" sizes="80px" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-[9px] text-hf-orange font-mono py-0.5">THUMB</div>
            </div>
          )}
        </div>
      )}

      {/* Upload progress + cancel */}
      {uploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-hf-muted font-mono">Uploading... {uploadProgress}%</span>
            <button
              onClick={handleCancel}
              className="text-xs text-red-400 hover:text-red-300 font-mono transition-colors"
            >
              ✕ Cancel Upload
            </button>
          </div>
          <div className="w-full h-1.5 bg-hf-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-hf-red to-hf-orange transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* PPV price input */}
      {visibility === 'ppv' && (
        <div className="mb-3">
          <input
            type="number"
            min="1"
            step="0.01"
            value={ppvPrice}
            onChange={e => setPpvPrice(e.target.value)}
            placeholder="Set your price (e.g. 9.99)"
            className="w-full bg-hf-dark border border-hf-border rounded-xl px-3 py-2 text-sm focus:border-hf-orange transition-colors"
          />
          {ppvPrice && (
            <p className="text-xs text-hf-muted mt-1 font-mono">
              Fan pays: ${(parseFloat(ppvPrice) * 1.30).toFixed(2)} · You earn: ${parseFloat(ppvPrice).toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Media upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-hf-dark border border-hf-border rounded-lg text-xs text-hf-muted hover:border-hf-orange hover:text-hf-orange transition-all"
        >
          📸 Media
        </button>

        {/* Visibility selector */}
        <div className="flex gap-1">
          {visibilityOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleVisibilityChange(opt.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                visibility === opt.value ? opt.color : 'border-hf-border text-hf-muted hover:border-hf-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={uploading || (!content.trim() && files.length === 0)}
          className="ml-auto px-5 py-1.5 bg-gradient-hf text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {uploading ? `Uploading ${uploadProgress}%` : '🔥 Post'}
        </button>
      </div>
    </div>
  );
  </>
  );
}
