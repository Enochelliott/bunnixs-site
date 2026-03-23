'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/lib/types';
import PostCard from '@/components/PostCard';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const supabase = createSupabaseBrowserClient();

type MediaFilter = 'all' | 'photos' | 'videos';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch this user's posts ──────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoadingPosts(true);

    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) { setLoadingPosts(false); return; }

    // Get likes
    const postIds = data.map(p => p.id);
    let likesMap: Record<string, { count: number; liked: boolean }> = {};
    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);
      likes?.forEach(like => {
        if (!likesMap[like.post_id]) likesMap[like.post_id] = { count: 0, liked: false };
        likesMap[like.post_id].count++;
        if (like.user_id === user.id) likesMap[like.post_id].liked = true;
      });
    }

    setPosts(data.map(post => ({
      ...post,
      profile: {
        id: profile?.id,
        username: profile?.username,
        avatar_url: profile?.avatar_url,
        is_verified_creator: profile?.is_verified_creator,
      },
      likes_count: likesMap[post.id]?.count || 0,
      liked_by_me: likesMap[post.id]?.liked || false,
    })) as Post[]);
    setLoadingPosts(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Image upload helper ───────────────────────────────────────────────────
  const uploadImage = async (file: File, bucket: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${uuidv4()}.${ext}`;
    const { error, data } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(`Upload failed: ${error.message}`); return null; }
    return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const url = await uploadImage(file, 'avatars');
    if (url) {
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      await refreshProfile();
      toast.success('Avatar updated!');
    }
    setUploadingAvatar(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    const url = await uploadImage(file, 'covers');
    if (url) {
      await supabase.from('profiles').update({ cover_url: url }).eq('id', user.id);
      await refreshProfile();
      toast.success('Cover photo updated!');
    }
    setUploadingCover(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
    }).eq('id', user.id);
    if (error) { toast.error('Could not save changes'); }
    else { await refreshProfile(); toast.success('Profile updated!'); setEditing(false); }
    setSaving(false);
  };

  // ── Filter posts by media type ────────────────────────────────────────────
  const filteredPosts = posts.filter(post => {
    if (mediaFilter === 'all') return true;
    if (mediaFilter === 'photos') return post.media_types?.includes('image');
    if (mediaFilter === 'videos') return post.media_types?.includes('video');
    return true;
  });

  // Post counts
  const photoCount = posts.filter(p => p.media_types?.includes('image')).length;
  const videoCount = posts.filter(p => p.media_types?.includes('video')).length;

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* ── Cover photo ── */}
      <div
        className="relative h-48 bg-gradient-to-br from-bunni-purple/30 via-bunni-pink/20 to-bunni-cyan/10 group cursor-pointer rounded-b-3xl overflow-hidden"
        onClick={() => editing && coverInputRef.current?.click()}
      >
        {profile.cover_url && (
          <Image src={profile.cover_url} alt="Cover" fill className="object-cover" />
        )}
        {editing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            {uploadingCover
              ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <div className="text-white text-center"><div className="text-3xl mb-1">📸</div><p className="text-sm font-semibold">Change cover</p></div>
            }
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* ── Profile header ── */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="flex items-end justify-between mb-4">
          {/* Avatar */}
          <div
            className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gradient-bunni border-4 border-bunni-dark group cursor-pointer flex-shrink-0 shadow-xl"
            onClick={() => editing && avatarInputRef.current?.click()}
          >
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                {profile.username[0].toUpperCase()}
              </div>
            )}
            {editing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                {uploadingAvatar
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <span className="text-xl">📷</span>
                }
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Edit / Save buttons */}
          <div className="flex gap-2 pb-1">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl border border-bunni-border text-xs text-bunni-muted hover:border-bunni-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-gradient-bunni text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setEditing(true); setDisplayName(profile.display_name || ''); setBio(profile.bio || ''); }}
                className="px-4 py-2 rounded-xl border border-bunni-border text-xs font-mono text-bunni-muted hover:border-bunni-pink hover:text-bunni-pink transition-all"
              >
                ✏ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Name + username */}
        {!editing ? (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">
                {profile.display_name || profile.username}
              </h1>
              {profile.role === 'creator' && (
                <span className="text-xs bg-bunni-pink/15 text-bunni-pink border border-bunni-pink/20 px-2 py-0.5 rounded-full font-mono">
                  👑 Creator
                </span>
              )}
              {profile.is_verified_creator && (
                <span className="text-xs bg-bunni-lime/15 text-bunni-lime border border-bunni-lime/20 px-2 py-0.5 rounded-full font-mono">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-bunni-muted text-sm font-mono">@{profile.username}</p>
          </div>
        ) : (
          <div className="mb-3">
            <label className="text-xs font-mono tracking-widest text-bunni-muted uppercase block mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={profile.username}
              maxLength={50}
              className="w-full bg-bunni-dark border border-bunni-border rounded-xl px-3 py-2 text-sm focus:border-bunni-pink transition-colors mb-1"
            />
          </div>
        )}

        {/* Bio */}
        {!editing ? (
          <p className="text-sm text-bunni-text/80 leading-relaxed mb-4">
            {profile.bio || <span className="text-bunni-muted italic">No bio yet — click Edit to add one</span>}
          </p>
        ) : (
          <div className="mb-4">
            <label className="text-xs font-mono tracking-widest text-bunni-muted uppercase block mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the world who you are..."
              rows={3}
              maxLength={200}
              className="w-full bg-bunni-dark border border-bunni-border rounded-xl px-3 py-2 text-sm focus:border-bunni-pink transition-colors resize-none"
            />
            <div className="text-right text-xs font-mono text-bunni-muted">{bio.length}/200</div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-6 mb-6 pt-3 border-t border-bunni-border">
          <div>
            <p className="font-display text-lg font-bold text-bunni-pink">{posts.length}</p>
            <p className="text-xs text-bunni-muted font-mono">posts</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-bunni-purple">{photoCount}</p>
            <p className="text-xs text-bunni-muted font-mono">photos</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-bunni-cyan">{videoCount}</p>
            <p className="text-xs text-bunni-muted font-mono">videos</p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-bunni-text">
              {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-bunni-muted font-mono">joined</p>
          </div>
        </div>
      </div>

      {/* ── Media filter tabs ── */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 bg-bunni-card border border-bunni-border rounded-2xl p-1.5">
          {([
            { value: 'all', label: `All (${posts.length})` },
            { value: 'photos', label: `📷 Photos (${photoCount})` },
            { value: 'videos', label: `🎬 Videos (${videoCount})` },
          ] as { value: MediaFilter; label: string }[]).map(tab => (
            <button
              key={tab.value}
              onClick={() => setMediaFilter(tab.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                mediaFilter === tab.value
                  ? 'bg-gradient-bunni text-white shadow-sm'
                  : 'text-bunni-muted hover:text-bunni-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Posts feed ── */}
      <div className="px-6">
        {loadingPosts ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-bunni-card border border-bunni-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full shimmer" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3 rounded shimmer" />
                    <div className="w-16 h-2 rounded shimmer" />
                  </div>
                </div>
                <div className="w-full h-3 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">
              {mediaFilter === 'photos' ? '📷' : mediaFilter === 'videos' ? '🎬' : '✨'}
            </div>
            <p className="font-display text-lg font-semibold mb-1">
              {mediaFilter === 'all' ? 'No posts yet' : `No ${mediaFilter} yet`}
            </p>
            <p className="text-bunni-muted text-sm">
              {mediaFilter === 'all'
                ? 'Go to your Studio to create your first post'
                : `You have not posted any ${mediaFilter} yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
