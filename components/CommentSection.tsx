'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import EmojiReactions from './EmojiReactions';

const supabase = createSupabaseBrowserClient();

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
}

interface Props {
  postId: string;
  postOwnerId: string;
}

export default function CommentSection({ postId, postOwnerId }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [showComments, setShowComments] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchCount();
    fetchComments();
  }, [postId]);

  const fetchCount = async () => {
    const { count } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    setCount(count || 0);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!data) return;

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    setComments(data.map(c => ({ ...c, profile: profileMap[c.user_id] })));
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim() || loading) return;
    setLoading(true);

    const { data, error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    }).select().single();

    if (!error && data) {
      if (user.id !== postOwnerId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          type: 'comment',
          title: '💬 New Comment',
          body: `@${profile?.username} commented: "${newComment.trim().slice(0, 50)}"`,
          actor_id: user.id,
          target_id: postId,
          target_type: 'post',
          read: false,
        });
      }

      setComments(prev => [...prev, {
        ...data,
        profile: { username: profile?.username || '', avatar_url: profile?.avatar_url || null }
      }]);
      setCount(prev => prev + 1);
      setNewComment('');
      setShowComments(true);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from('post_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setCount(prev => prev - 1);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="border-t border-bunni-border/50 px-5 pt-3 pb-4">

      {/* Existing comments — toggle */}
      {count > 0 && (
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-xs text-bunni-muted hover:text-bunni-pink transition-colors font-mono mb-3 flex items-center gap-1"
        >
          <span>💬</span>
          <span>{showComments ? 'Hide' : 'View'} {count} comment{count === 1 ? '' : 's'}</span>
          <span>{showComments ? '▲' : '▼'}</span>
        </button>
      )}

      {showComments && comments.length > 0 && (
        <div className="space-y-3 mb-3">
          {!showAll && count > 3 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-bunni-pink hover:underline font-mono"
            >
              View all {count} comments
            </button>
          )}
          {(showAll ? comments : comments.slice(-3)).map(comment => (
            <div key={comment.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-bunni flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {comment.profile?.avatar_url
                  ? <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : comment.profile?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="bg-bunni-dark rounded-2xl px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-bunni-pink">@{comment.profile?.username}</p>
                    <span className="text-[10px] text-bunni-muted font-mono">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-bunni-text">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-2">
                  <EmojiReactions targetId={comment.id} targetType="comment" />
                  {(user?.id === comment.user_id || user?.id === postOwnerId) && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[10px] text-bunni-muted hover:text-red-400 transition-colors font-mono"
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Always visible comment input */}
      {user && (
        <div className="flex gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-bunni flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : profile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Comment here..."
              maxLength={500}
              className="flex-1 bg-bunni-dark border border-bunni-border rounded-full px-4 py-2 text-sm focus:border-bunni-pink transition-colors placeholder:text-bunni-muted/60"
            />
            {newComment.trim() && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-bunni-pink text-white text-xs font-bold rounded-full hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {loading ? '...' : 'Post'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
