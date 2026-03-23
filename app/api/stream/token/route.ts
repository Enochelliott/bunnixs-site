import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

async function handleRequest(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    const accessToken = authHeader.replace('Bearer ', '').trim();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );

    await serverClient.upsertUsers([{
      id: user.id,
      name: profile.username,
      image: profile.avatar_url || 'https://getstream.io/random_svg/?name=' + profile.username,
    }]);

    const streamToken = serverClient.createToken(user.id);
    return NextResponse.json({ token: streamToken });
  } catch (error) {
    console.error('Stream token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) { return handleRequest(request); }
export async function POST(request: Request) { return handleRequest(request); }
