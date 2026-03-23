import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hmac-signature') || '';

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.VERIFF_SHARED_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid Veriff webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const { verification } = data;

    if (!verification) {
      return NextResponse.json({ ok: true });
    }

    const sessionId = verification.id;
    const status = verification.status; // 'approved' | 'declined' | 'resubmission_requested' | 'expired'
    const person = verification.person || {};
    const document = verification.document || {};

    // Map Veriff status to our status
    const ourStatus = status === 'approved' ? 'approved'
      : status === 'declined' ? 'rejected'
      : status === 'expired' ? 'expired'
      : 'pending';

    // Get our session record
    const { data: session } = await supabase
      .from('veriff_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!session) {
      console.error('Session not found:', sessionId);
      return NextResponse.json({ ok: true });
    }

    // Update session status
    await supabase
      .from('veriff_sessions')
      .update({
        status: ourStatus,
        decision_data: verification,
        decided_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    const vendorData = session.invite_token
      ? JSON.parse(verification.vendorData || '{}')
      : {};

    // Handle based on verification type
    if (session.verification_type === 'creator') {
      if (ourStatus === 'approved' && session.user_id) {
        // Mark creator as verified
        await supabase
          .from('profiles')
          .update({ is_verified_creator: true })
          .eq('id', session.user_id);

        // Notify creator
        await supabase.from('notifications').insert({
          user_id: session.user_id,
          type: 'verification_approved',
          title: '✅ Identity Verified!',
          body: 'Your identity has been verified. You can now post content.',
          read: false,
        });
      } else if (ourStatus === 'rejected' && session.user_id) {
        // Check flag count
        const { data: profile } = await supabase
          .from('profiles')
          .select('verification_flag_count')
          .eq('id', session.user_id)
          .single();

        const flagCount = (profile?.verification_flag_count || 0) + 1;
        await supabase
          .from('profiles')
          .update({ verification_flag_count: flagCount })
          .eq('id', session.user_id);

        await supabase.from('notifications').insert({
          user_id: session.user_id,
          type: 'verification_rejected',
          title: flagCount >= 3 ? '🚨 Account Flagged' : '❌ Verification Failed',
          body: flagCount >= 3
            ? 'Your account has been flagged. Our team will contact you for a video call verification.'
            : `Verification failed. You have ${3 - flagCount} attempt(s) remaining.`,
          read: false,
        });
      }
    } else if (session.verification_type === 'fan') {
      if (ourStatus === 'approved' && session.user_id) {
        // Save to approved_fans
        await supabase.from('approved_fans').upsert({
          user_id: session.user_id,
          verification_method: 'veriff',
          veriff_session_id: sessionId,
          verified_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } else if (ourStatus === 'rejected' && session.user_id) {
        const { data: fan } = await supabase
          .from('approved_fans')
          .select('flag_count')
          .eq('user_id', session.user_id)
          .maybeSingle();

        const flagCount = (fan?.flag_count || 0) + 1;
        if (flagCount >= 3) {
          await supabase.from('approved_fans').upsert({
            user_id: session.user_id,
            flag_count: flagCount,
            verification_method: 'veriff',
          }, { onConflict: 'user_id' });
        }
      }
    } else if (session.verification_type === 'co_creator') {
      if (ourStatus === 'approved' && session.invite_token) {
        // Get invite
        const { data: invite } = await supabase
          .from('co_creator_invites')
          .select('*')
          .eq('token', session.invite_token)
          .single();

        if (invite) {
          // Save co-creator
          await supabase.from('co_creators').insert({
            invited_by_creator_id: invite.creator_id,
            invite_id: invite.id,
            veriff_session_id: sessionId,
            full_name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
            date_of_birth: person.dateOfBirth || null,
            document_number: document.number || null,
            document_country: document.country || null,
            verification_status: 'approved',
          });

          // Mark invite as used
          await supabase
            .from('co_creator_invites')
            .update({ status: 'used', used_at: new Date().toISOString() })
            .eq('token', session.invite_token);

          // Notify creator
          const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();
          await supabase.from('notifications').insert({
            user_id: invite.creator_id,
            type: 'co_creator_verified',
            title: '✅ Co-Creator Verified!',
            body: `${name} has been verified as your co-creator and can now appear in your content.`,
            read: false,
          });
        }
      } else if (ourStatus === 'rejected' && session.invite_token) {
        const { data: invite } = await supabase
          .from('co_creator_invites')
          .select('creator_id')
          .eq('token', session.invite_token)
          .single();

        if (invite) {
          // Check existing flag count
          const { data: existing } = await supabase
            .from('co_creators')
            .select('flag_count')
            .eq('veriff_session_id', sessionId)
            .maybeSingle();

          const flagCount = (existing?.flag_count || 0) + 1;

          await supabase.from('notifications').insert({
            user_id: invite.creator_id,
            type: 'co_creator_rejected',
            title: flagCount >= 3 ? '🚨 Co-Creator Flagged' : '❌ Co-Creator Verification Failed',
            body: flagCount >= 3
              ? 'A co-creator verification has been flagged 3 times. Our team will review.'
              : `A co-creator verification failed. They have ${3 - flagCount} attempt(s) remaining.`,
            read: false,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('Veriff webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function GET() {
  return new Response('OK', { status: 200 });
}
