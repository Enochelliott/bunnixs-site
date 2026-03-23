import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ count: 0 });
    const accessToken = authHeader.replace('Bearer ', '').trim();

    // Verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) return NextResponse.json({ count: 0 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Use server client to generate a user token
    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );

    // Create a user-scoped client
    const userToken = serverClient.createToken(user.id);
    
    // Use REST API directly to get unread counts
    const response = await fetch(
      `https://chat.stream-io-api.com/channels?api_key=${process.env.NEXT_PUBLIC_STREAM_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stream-auth-type': 'jwt',
          'Authorization': userToken,
        },
        body: JSON.stringify({
          filter_conditions: { members: { $in: [user.id] } },
          sort: [{ field: 'last_message_at', direction: -1 }],
          limit: 30,
          state: true,
          watch: false,
          presence: false,
        }),
      }
    );

    if (!response.ok) {
      console.error('Stream API error:', response.status, await response.text());
      return NextResponse.json({ count: 0 });
    }

    const data = await response.json();
    const firstCh = data.channels?.[0]; console.log('membership:', JSON.stringify(firstCh?.membership), 'read:', JSON.stringify(firstCh?.read));
    const channels = data.channels || [];

    let totalUnread = 0;
    let latestMessage = null;
    let latestTime = 0;

    for (const ch of channels) {
      const readEntry = (ch.read || []).find((r: any) => r.user?.id === user.id);
      const unread = readEntry?.unread_messages || 0;
      totalUnread += unread;

      if (unread > 0 && ch.channel?.last_message_at) {
        const msgs = ch.messages || [];
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg.user?.id !== user.id) {
            const t = new Date(msg.created_at || 0).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestMessage = {
                id: msg.id,
                text: msg.text,
                from: msg.user?.name || msg.user?.id,
                avatar: msg.user?.image,
              };
            }
            break;
          }
        }
      }
    }

    return NextResponse.json({ count: totalUnread, latestMessage });
  } catch (err) {
    console.error('Unread count error:', err);
    return NextResponse.json({ count: 0 });
  }
}
