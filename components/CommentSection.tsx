'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import EmojiReactions from './EmojiReactions';
import FanDataPopup from './creator/FanDataPopup';
import OnlineAvatar from './content/OnlineAvatar';

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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { fetchComments(); }, [postId]);

  const fetchComments = async () => {
    const { data, count: total } = await supabase
      .from('post_comments').select('*', { count: 'exact' })
      .eq('post_id', postId).order('created_at', { ascending: true }).limit(50);
    setCount(total || 0);
    if (!data) return;
    const ids = Array.from(new Set(data.map(c => c.user_id)));
    const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids);
    const pm: Record<string, any> = {};
    (profiles || []).forEach(p => { pm[p.id] = p; });
    setComments(data.map(c => ({ ...c, profile: pm[c.user_id] })));
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim() || loading) return;
    setLoading(true);
    const { data, error } = await supabase.from('post_comments').insert({
      post_id: postId, user_id: user.id, content: newComment.trim(),
    }).select().single();
    if (!error && data) {
      if (user.id !== postOwnerId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId, type: 'comment', title: '💬 New Comment',
          body: `@${profile?.username} commented: "${newComment.trim().slice(0, 50)}"`,
          actor_id: user.id, target_id: postId, target_type: 'post', read: false,
        });
      }
      setComments(prev => [...prev, { ...data, profile: { username: profile?.username || '', avatar_url: profile?.avatar_url || null } }]);
      setCount(prev => prev + 1);
      setNewComment('');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('post_comments').delete().eq('id', id);
    setComments(prev => prev.filter(c => c.id !== id));
    setCount(prev => prev - 1);
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const displayed = showAll ? comments : comments.slice(-3);

  return (
    <div className="border-t border-hf-border/50 px-5 pt-3 pb-4">
      {count > 3 && !showAll && (
        <button onClick={() => setShowAll(true)} className="text-xs text-hf-orange hover:underline font-mono mb-3">
          View all {count} comments
        </button>
      )}

      {displayed.length > 0 && (
        <div className="space-y-3 mb-3">
          {displayed.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <FanDataPopup fanId={comment.user_id}>
                <OnlineAvatar
                  userId={comment.user_id}
                  username={comment.profile?.username || ''}
                  avatarUrl={comment.profile?.avatar_url || null}
                  size={28}
                />
              </FanDataPopup>
              <div className="flex-1">
                <div className="bg-hf-dark rounded-2xl px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-hf-orange">@{comment.profile?.username}</p>
                    <span className="text-[10px] text-hf-muted font-mono">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-hf-text">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-2">
                  <EmojiReactions targetId={comment.id} targetType="comment" postOwnerId={postOwnerId} />
                  {(user?.id === comment.user_id || user?.id === postOwnerId) && (
                    <button onClick={() => handleDelete(comment.id)} className="text-[10px] text-hf-muted hover:text-red-400 transition-colors font-mono">delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="flex gap-2 items-center">
          <OnlineAvatar userId={user.id} username={profile?.username || ''} avatarUrl={profile?.avatar_url || null} size={32} />
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Comment here..."
              maxLength={500}
              className="flex-1 bg-hf-dark border border-hf-border rounded-full px-4 py-2 text-sm text-hf-text focus:border-hf-orange transition-colors placeholder:text-hf-muted/60"
            />
            {newComment.trim() && (
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-white text-xs font-bold rounded-full hover:opacity-90 disabled:opacity-40 transition-all" style={{ background: 'linear-gradient(135deg, #CC2400, #FF6B00)' }}>
                {loading ? '...' : 'Post'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


