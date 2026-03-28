'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { getStreamClient } from '@/lib/stream';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { PPVComposer } from '@/components/PPVComposer';
import { PPVMessageCard } from '@/components/PPVMessageCard';

const Chat = dynamic(() => import('stream-chat-react').then(m => m.Chat), { ssr: false });
const Channel = dynamic(() => import('stream-chat-react').then(m => m.Channel), { ssr: false });
const ChannelHeader = dynamic(() => import('stream-chat-react').then(m => m.ChannelHeader), { ssr: false });
const ChannelList = dynamic(() => import('stream-chat-react').then(m => m.ChannelList), { ssr: false });
const MessageInput = dynamic(() => import('stream-chat-react').then(m => m.MessageInput), { ssr: false });
const MessageList = dynamic(() => import('stream-chat-react').then(m => m.MessageList), { ssr: false });
const Thread = dynamic(() => import('stream-chat-react').then(m => m.Thread), { ssr: false });
const Window = dynamic(() => import('stream-chat-react').then(m => m.Window), { ssr: false });

import 'stream-chat-react/dist/css/v2/index.css';

const supabase = createSupabaseBrowserClient();

// Renders PPV cards + videos + images for custom attachments
function PPVAttachmentRenderer({ attachments }: { attachments?: any[] }) {
  const { profile } = useAuth();
  const isCreator = profile?.role === 'creator';
  if (!attachments?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {attachments.map((att: any, i: number) =>
        att.type === 'ppv' ? (
          <PPVMessageCard key={i} attachment={att} isCreator={isCreator} />
        ) : att.image_url ? (
          <img key={i} src={att.image_url} alt="" className="max-w-xs rounded-xl" />
        ) : att.asset_url && (att.mime_type?.startsWith('video') || att.type === 'video') ? (
          <video key={i} src={att.asset_url} controls className="max-w-xs rounded-xl" />
        ) : att.asset_url ? (
          <a key={i} href={att.asset_url} target="_blank" rel="noopener noreferrer"
            className="text-bunni-cyan underline text-sm">{att.title || 'Download file'}</a>
        ) : null
      )}
    </div>
  );
}

export default function MessagesPage() {
  const [client, setClient] = useState<ReturnType<typeof getStreamClient> | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDmUsername, setNewDmUsername] = useState('');
  const [showNewDm, setShowNewDm] = useState(false);
  const [showPPV, setShowPPV] = useState(false);
  const { user, profile } = useAuth();
  const { openProfileModal } = useNotifications();
  const isCreator = profile?.role === 'creator';

  // Click interceptor for profile modals
  useEffect(() => {
    if (!user) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.str-chat')) return;
      if (target.tagName === 'A' || target.closest('a')) return;
      const avatar = target.closest('.str-chat__avatar') as HTMLElement | null;
      const senderName = target.closest('.str-chat__message-sender-name') as HTMLElement | null;
      const previewTitle = target.closest('.str-chat__channel-preview-title') as HTMLElement | null;
      const clickable = avatar || senderName || previewTitle;
      if (!clickable) return;
      let text = '';
      if (avatar) {
        text = avatar.getAttribute('title')?.trim() || '';
        if (!text) {
          const msg = avatar.closest('.str-chat__message, .str-chat__channel-preview');
          const nameEl = msg?.querySelector('.str-chat__message-sender-name, .str-chat__channel-preview-title');
          text = nameEl?.textContent?.trim() || '';
        }
      } else {
        text = clickable.textContent?.trim() || '';
      }
      if (!text || text === profile?.username) return;
      e.preventDefault();
      e.stopPropagation();
      const username = text.replace(/^@/, '').toLowerCase().trim();
      if (username && username.length > 1) openProfileModal(username);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [user, profile, openProfileModal]);

  const initStream = useCallback(async () => {
    if (!user || !profile) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch('/api/stream/token', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Token failed');
      const { token } = await res.json();
      const streamClient = getStreamClient();
      if (!streamClient.userID) {
        await streamClient.connectUser(
          { id: user.id, name: profile.username, image: profile.avatar_url || undefined },
          token
        );
      }
      setClient(streamClient);
    } catch (err) {
      console.error('Stream init error:', err);
      toast.error('Could not connect to messaging');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    initStream();
    return () => { getStreamClient().disconnectUser().catch(() => {}); };
    return () => {};

  const startNewDm = async () => {
    if (!client || !user || !newDmUsername.trim()) return;
    try {
      const response = await client.queryUsers(
        { name: { $autocomplete: newDmUsername.toLowerCase() } }, {}, { limit: 5 }
      );
      if (!response.users.length) { toast.error(`No user: @${newDmUsername}`); return; }
      const targetUser = response.users.find((u: any) => u.id !== user.id);
      if (!targetUser) { toast.error('Cannot DM yourself'); return; }
      const channel = client.channel('messaging', { members: [user.id, targetUser.id] });
      await channel.watch();
      setNewDmUsername('');
      setShowNewDm(false);
      toast.success(`DM started with @${targetUser.name}!`);
    } catch (err) {
      toast.error('Could not start DM');
    }
  };

  const sendPPV = async (attachment: any) => {
    if (!client) { toast.error('Not connected'); return; }
    const channel = client.activeChannels ? Object.values(client.activeChannels)[0] as any : null;
    if (!channel) { toast.error('Open a conversation first'); return; }
    try {
      await channel.sendMessage({ text: '', attachments: [attachment] });
      toast.success('PPV offer sent! 💎');
    } catch (err) {
      toast.error('Could not send PPV');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bunni-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" />
        <p className="text-bunni-muted text-sm font-mono">Connecting to messages...</p>
      </div>
    </div>
  );

  if (!client) return (
    <div className="flex items-center justify-center h-screen bg-bunni-dark">
      <div className="text-center">
        <p className="text-5xl mb-4">💬</p>
        <p className="text-bunni-muted mb-2">Could not connect to messaging.</p>
        <button onClick={() => { setLoading(true); initStream(); }}
          className="mt-4 px-4 py-2 bg-bunni-pink text-white rounded-xl text-sm hover:opacity-90 transition-all">
          Retry
        </button>
      </div>
    </div>
  );

  const filters = { type: 'messaging', members: { $in: [user!.id] } };
  const sort = [{ last_message_at: -1 as const }];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>
    <div className="flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>
      {showPPV && <PPVComposer onSend={sendPPV} onClose={() => setShowPPV(false)} />}
      <div className="px-6 py-4 border-b border-bunni-border flex items-center justify-between bg-bunni-card flex-shrink-0">
        <h1 className="font-display text-2xl font-bold text-gradient">Messages</h1>
        <button onClick={() => setShowNewDm(!showNewDm)}
          className="bg-gradient-bunni text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all">
          {showNewDm ? '✕ Cancel' : '+ New DM'}
        </button>
      </div>

      {showNewDm && (
        <div className="px-6 py-3 border-b border-bunni-border bg-bunni-dark flex gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bunni-muted font-mono text-sm">@</span>
            <input type="text" value={newDmUsername}
              onChange={e => setNewDmUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startNewDm()}
              placeholder="username" autoFocus
              className="w-full bg-bunni-card border border-bunni-border rounded-xl pl-7 pr-4 py-2 text-sm focus:border-bunni-pink transition-colors font-mono" />
          </div>
          <button onClick={startNewDm} disabled={!newDmUsername.trim()}
            className="bg-bunni-pink text-white text-sm px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all">
            Start
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Chat client={client} theme="str-chat__theme-dark">
          <div className="flex h-full">
            <div className="w-72 flex-shrink-0 border-r border-bunni-border overflow-y-auto">
              <ChannelList filters={filters} sort={sort} />
            </div>
            <div className="flex-1 overflow-hidden">
              <Channel Attachment={PPVAttachmentRenderer}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <div className="relative">
                    {isCreator && (
                      <div className="px-3 pt-2 pb-1 border-t border-bunni-border flex items-center">
                        <button onClick={() => setShowPPV(true)}
                          className="bg-bunni-dark border border-bunni-pink/40 text-bunni-pink text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-bunni-pink/10 transition-all whitespace-nowrap">
                          📸💰 Sell Pics/Vids
                        </button>
                      </div>
                    )}
                    <MessageInput />
                  </div>
                </Window>
                <Thread />
              </Channel>
            </div>
          </div>
        </Chat>
      </div>
    </div>
  );
}
