'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const supabase = createSupabaseBrowserClient();

interface PPVComposerProps {
  onSend: (attachment: any) => void;
  onClose: () => void;
}

export function PPVComposer({ onSend, onClose }: PPVComposerProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [price, setPrice] = useState('9.99');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [title, setTitle] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('posts')
      .select('id, content, media_urls, media_types, visibility')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPosts(data?.filter(p => p.media_urls?.length > 0) || []);
        setLoading(false);
      });
  }, [user]);

  const uploadThumbnail = async (file: File): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    await new Promise<void>((resolve) => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.crossOrigin = 'anonymous';
        video.currentTime = 1;
        video.onloadeddata = () => { ctx?.drawImage(video, 0, 0, 160, 90); resolve(); };
        video.onerror = () => resolve();
      } else {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => { ctx?.drawImage(img, 0, 0, 160, 90); resolve(); };
        img.onerror = () => resolve();
      }
    });
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.6));
    if (!blob) return '';
    const filename = `ppv-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(`thumbs/${filename}`, blob, { contentType: 'image/jpeg', upsert: true });
    if (error || !data) return '';
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(`thumbs/${filename}`);
    return publicUrl;
  };


  const uploadMedia = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `ppv-media-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(`ppv/${filename}`, file, { contentType: file.type, upsert: true });
    if (error || !data) return '';
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(`ppv/${filename}`);
    return publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelected(null);
    setUploading(true);
    const newPreviews: string[] = [];
    const newMediaUrls: string[] = [];
    for (const file of files) {
      const [thumb, media] = await Promise.all([uploadThumbnail(file), uploadMedia(file)]);
      newPreviews.push(thumb);
      newMediaUrls.push(media);
    }
    setUploadedFiles(prev => [...prev, ...files]);
    setUploadedPreviews(prev => [...prev, ...newPreviews]);
    setUploadedMediaUrls(prev => [...prev, ...newMediaUrls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = () => {
    const priceInCents = Math.round(parseFloat(price) * 100);
    if (isNaN(priceInCents) || priceInCents < 100) return;

    if (tab === 'upload' && uploadedFiles.length > 0) {
      const isVid = uploadedFiles[0]?.type.startsWith('video/');
      onSend({
        type: 'ppv',
        post_id: `upload_${Date.now()}`,
        title: title.trim() || (isVid ? 'Exclusive Video' : uploadedFiles.length > 1 ? `${uploadedFiles.length} Exclusive Photos` : 'Exclusive Photo'),
        price: priceInCents,
        thumbnail_url: uploadedPreviews[0] || undefined,
        media_url: uploadedMediaUrls[0] || uploadedPreviews[0] || undefined,
        media_count: uploadedFiles.length,
        media_type: isVid ? 'video' : 'image',
      });
      onClose();
    } else if (tab === 'library' && selected) {
      onSend({
        type: 'ppv',
        post_id: selected.id,
        title: title.trim() || selected.content?.slice(0, 50) || 'Exclusive Content',
        price: priceInCents,
        thumbnail_url: selected.media_urls?.[0],
        media_url: selected.media_urls?.[0],
        media_count: selected.media_urls?.length || 1,
        media_type: selected.media_types?.[0] || 'image',
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-end justify-center p-4"
      onClick={onClose}>
      <div className="bg-bunni-card border border-bunni-border rounded-3xl w-full max-w-md p-5"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">💎 Sell Pics/Vids</h3>
          <button onClick={onClose} className="text-bunni-muted hover:text-white transition-colors">✕</button>
        </div>

        {/* Price input */}
        <div className="mb-4">
          <label className="text-xs text-bunni-muted font-mono mb-1 block">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bunni-muted font-mono">$</span>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              min="1" step="0.01"
              className="w-full bg-bunni-dark border border-bunni-border rounded-xl pl-7 pr-4 py-2.5 text-sm font-mono focus:border-bunni-pink transition-colors" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTab('upload')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'upload' ? 'bg-bunni-pink text-white' : 'bg-bunni-dark border border-bunni-border text-bunni-muted'}`}>
            📁 Upload New
          </button>
          <button onClick={() => setTab('library')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'library' ? 'bg-bunni-pink text-white' : 'bg-bunni-dark border border-bunni-border text-bunni-muted'}`}>
            🗂 From Library
          </button>
        </div>

        {/* Title */}
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-bunni-dark border border-bunni-border rounded-xl px-3 py-2 text-sm mb-3 focus:border-bunni-pink transition-colors" />

        {/* Content picker */}
        <div className="mb-4">
          {tab === 'upload' ? (
            <div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
              {uploadedPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2 max-h-36 overflow-y-auto">
                  {uploadedPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-bunni-dark border border-bunni-border">
                      {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>}
                      <button onClick={() => {
                        setUploadedFiles(prev => prev.filter((_, idx) => idx !== i));
                        setUploadedPreviews(prev => prev.filter((_, idx) => idx !== i));
                        setUploadedMediaUrls(prev => prev.filter((_, idx) => idx !== i));
                      }} className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-500 transition-all">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-bunni-border hover:border-bunni-pink transition-all flex items-center justify-center gap-2 text-bunni-muted hover:text-bunni-pink text-sm disabled:opacity-50">
                {uploading ? <><div className="w-4 h-4 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" /> Uploading preview...</> : <><span>＋</span><span className="font-mono text-xs">{uploadedFiles.length > 0 ? 'Add more files' : 'Upload photo or video'}</span></>}
              </button>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <p className="text-center text-bunni-muted text-sm py-4">No media posts found.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {posts.map(post => (
                    <div key={post.id} onClick={() => setSelected(post)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selected?.id === post.id ? 'border-bunni-pink' : 'border-transparent'}`}>
                      {post.media_types?.[0] === 'image' ? (
                        <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-bunni-dark flex items-center justify-center"><span className="text-2xl">🎬</span></div>
                      )}
                      {selected?.id === post.id && <div className="absolute inset-0 bg-bunni-pink/20 flex items-center justify-center"><span className="text-xl">✓</span></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleSend}
          disabled={(!selected && uploadedFiles.length === 0) || !price || uploading}
          className="w-full py-3 bg-gradient-bunni text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all">
          💎 Send PPV Offer
        </button>
      </div>
    </div>
  );
}
