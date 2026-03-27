'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Post } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection';
import EmojiReactions from './EmojiReactions';
import FanDataPopup from './creator/FanDataPopup';
import PPVPost from './content/PPVPost';
import OnlineAvatar from './content/OnlineAvatar';

const supabase = createSupabaseBrowserClient();

interface PostCardProps {
  post: Post;
  onDelete?: () => void;
}

const REPORT_REASONS = [
  { value: 'illegal_content', label: '🚨 Illegal content' },
  { value: 'underage', label: '🔞 Underage concern' },
  { value: 'non_consensual', label: '⛔ Non-consensual' },
  { value: 'spam', label: '🗑 Spam / scam' },
  { value: 'other', label: '📋 Other' },
];

export default function PostCard({ post, onDelete }: PostCardProps) {
  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ppvPurchased, setPpvPurchased] = useState(post.is_purchased || false);
  const { user, profile } = useAuth();
  const { openProfileModal } = useNotifications();
  const isOwner = user?.id === post.user_id;
  const showPPVLock = post.visibility === 'ppv' && !isOwner && !ppvPurchased;

  useEffect(() => {
    if (!user || isOwner || !post.user_id) return;
    const activityType = post.visibility === 'ppv' && !ppvPurchased ? 'ppv_view_no_purchase'
      : post.visibility === 'subscribers' ? 'subscriber_view_no_sub' : 'post_view';
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch('/api/fan-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ creatorId: post.user_id, activityType, targetId: post.id, targetType: 'post' }),
      }).catch(() => {});
    });
  }, [post.id]);

  const handleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    if (newLiked) {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
      if (user.id !== post.user_id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, type: 'like', title: '❤️ New Like',
          body: '@' + (profile?.username || 'Someone') + ' liked your post',
          actor_id: user.id, target_id: post.id, target_type: 'post', read: false,
        });
      }
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) toast.error('Could not delete post');
    else { toast.success('Post deleted'); onDelete?.(); }
    setShowMenu(false);
  };

  const handleReport = async (reason: string) => {
    if (!user) return;
    await supabase.from('post_reports').insert({ post_id: post.id, reporter_id: user.id, reason, status: 'pending' });
    toast.success('Report submitted.');
    setShowReport(false); setShowMenu(false);
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const visibilityBadge = {
    free: { label: '🌍 Free', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
    subscribers: { label: '⭐ Subs', color: 'text-hf-orange bg-hf-orange/10 border-hf-orange/20' },
    ppv: { label: '💎 PPV', color: 'text-hf-red bg-hf-red/10 border-hf-red/20' },
  }[post.visibility];

  return (
    <>
      <article className="bg-hf-card border border-hf-border rounded-2xl overflow-hidden animate-fade-in hover:border-hf-muted/50 transition-colors group" id={`post-${post.id}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <FanDataPopup fanId={post.user_id}>
              <OnlineAvatar
                userId={post.user_id}
                username={post.profile?.username || ''}
                avatarUrl={post.profile?.avatar_url || null}
                size={40}
                onClick={() => post.profile?.username && openProfileModal(post.profile.username)}
              />
            </FanDataPopup>
            <div>
              <button onClick={() => post.profile?.username && openProfileModal(post.profile.username)} className="font-semibold text-sm hover:text-hf-orange transition-colors">
                @{post.profile?.username}
              </button>
              <p className="text-xs text-hf-muted font-mono">{timeAgo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${visibilityBadge?.color}`}>{visibilityBadge?.label}</span>
            <div className="relative">
              <button onClick={() => { setShowMenu(!showMenu); setShowReport(false); }} className="text-hf-muted hover:text-hf-text opacity-0 group-hover:opacity-100 transition-all text-lg w-8 h-8 rounded-lg hover:bg-hf-border flex items-center justify-center">···</button>
              {showMenu && (
                <div className="absolute right-0 top-10 bg-hf-dark border border-hf-border rounded-xl overflow-hidden shadow-xl z-20 w-44 animate-slide-up">
                  {isOwner
                    ? <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10">🗑 Delete post</button>
                    : <button onClick={() => { setShowReport(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/10">⚑ Report post</button>}
                </div>
              )}
              {showReport && !isOwner && (
                <div className="absolute right-0 top-10 bg-hf-dark border border-hf-border rounded-xl overflow-hidden shadow-2xl z-20 w-52 animate-slide-up">
                  <p className="px-3 py-2 text-xs font-mono text-hf-muted uppercase tracking-widest border-b border-hf-border">Report reason</p>
                  {REPORT_REASONS.map(r => <button key={r.value} onClick={() => handleReport(r.value)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-hf-border/50">{r.label}</button>)}
                  <button onClick={() => setShowReport(false)} className="w-full text-left px-4 py-2.5 text-xs text-hf-muted hover:bg-hf-border/30 border-t border-hf-border">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {post.content && <div className="px-5 pb-3"><p className="text-hf-text leading-relaxed whitespace-pre-wrap">{post.content}</p></div>}

        {showPPVLock ? (
          <PPVPost post={post} onPurchased={() => setPpvPurchased(true)} />
        ) : post.media_urls && post.media_urls.length > 0 && (
          <div className={`grid gap-0.5 ${post.media_urls.length === 1 ? 'grid-cols-1' : post.media_urls.length === 2 ? 'grid-cols-2' : post.media_urls.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {post.media_urls.map((url, i) => (
              <div key={i} className={`relative bg-hf-dark cursor-pointer overflow-hidden ${post.media_urls.length === 1 ? 'aspect-[4/3]' : post.media_urls.length === 3 && i === 0 ? 'row-span-2 aspect-square' : 'aspect-square'}`} onClick={() => post.media_types?.[i] === 'image' && setLightbox(url)}>
                {post.media_types?.[i] === 'image'
                  ? <Image src={url} alt="" fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="600px" />
                  : <video src={url} controls className="w-full h-full object-cover" onClick={e => e.stopPropagation()} />}
              </div>
            ))}
          </div>
        )}

        {!showPPVLock && (
          <div className="flex items-center gap-4 px-5 py-4">
            <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm transition-all hover:scale-110 active:scale-95 ${liked ? 'text-hf-red' : 'text-hf-muted hover:text-hf-red'}`}>
              <span className={`text-lg ${liked ? 'animate-scale-in' : ''}`}>{liked ? '♥' : '♡'}</span>
              {likesCount > 0 && <span className="font-mono">{likesCount}</span>}
            </button>
          </div>
        )}

        {!showPPVLock && (
          <>
            <div className="px-5 pb-3"><EmojiReactions targetId={post.id} targetType="post" postOwnerId={post.user_id} /></div>
            <CommentSection postId={post.id} postOwnerId={post.user_id} />
          </>
        )}
      </article>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer animate-fade-in" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <Image src={lightbox} alt="" width={1200} height={900} className="max-h-[90vh] w-auto rounded-xl object-contain" />
            <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-hf-red">✕</button>
          </div>
        </div>
      )}
      {(showMenu || showReport) && <div className="fixed inset-0 z-10" onClick={() => { setShowMenu(false); setShowReport(false); }} />}
    </>
  );
}
