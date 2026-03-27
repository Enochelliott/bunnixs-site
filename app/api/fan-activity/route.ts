import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logFanActivity, ActivityType } from '@/lib/fan-activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ ok: true });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ ok: true });

    const { creatorId, activityType, targetId, targetType, metadata } = await request.json();

    if (!creatorId || !activityType) return NextResponse.json({ ok: true });

    await logFanActivity({
      fanId: user.id,
      creatorId,
      activityType: activityType as ActivityType,
      targetId,
      targetType,
      metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: true });
  }
}
