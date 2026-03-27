import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { verificationType, inviteToken, userId } = await request.json();

    if (!verificationType) {
      return NextResponse.json({ error: 'verificationType required' }, { status: 400 });
    }

    // Build Veriff session payload
    const sessionPayload: any = {
      verification: {
        callback: 'https://41fe-173-186-212-32.ngrok-free.app/verify/complete',
        person: {
          firstName: ' ',
          lastName: ' ',
        },
        document: {
          type: 'ID_CARD',
        },
        vendorData: JSON.stringify({
          verificationType,
          inviteToken: inviteToken || null,
          userId: userId || null,
        }),
      },
    };

    // Create Veriff session
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify(sessionPayload);
    const signature = crypto
      .createHmac('sha256', process.env.VERIFF_SHARED_SECRET!)
      .update(payload)
      .digest('hex');

    const veriffResponse = await fetch(`${process.env.NEXT_PUBLIC_VERIFF_BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': process.env.VERIFF_API_KEY!,
        'X-HMAC-SIGNATURE': signature,
      },
      body: payload,
    });

    if (!veriffResponse.ok) {
      const err = await veriffResponse.text();
      console.error('Veriff session creation failed:', err);
      return NextResponse.json({ error: 'Failed to create Veriff session' }, { status: 500 });
    }

    const veriffData = await veriffResponse.json();
    const sessionId = veriffData.verification?.id;
    const sessionUrl = veriffData.verification?.url;

    if (!sessionId || !sessionUrl) {
      return NextResponse.json({ error: 'Invalid Veriff response' }, { status: 500 });
    }

    // Save session to DB
    await supabase.from('veriff_sessions').insert({
      session_id: sessionId,
      verification_type: verificationType,
      user_id: userId || null,
      invite_token: inviteToken || null,
      status: 'pending',
    });

    return NextResponse.json({ sessionId, sessionUrl });

  } catch (err) {
    console.error('Veriff session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

