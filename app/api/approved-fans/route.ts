import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { method, userId } = await request.json();
    if (!userId) return NextResponse.json({ ok: true });

    await supabase.from('approved_fans').upsert({
      user_id: userId,
      verification_method: method,
      verified_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
