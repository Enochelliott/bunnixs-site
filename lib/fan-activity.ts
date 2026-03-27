import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type ActivityType =
  | 'profile_view'
  | 'post_view'
  | 'ppv_view_no_purchase'
  | 'subscriber_view_no_sub'
  | 'ppv_purchase'
  | 'subscription_start'
  | 'subscription_cancel'
  | 'message_sent'
  | 'comment'
  | 'reaction'
  | 'review';

interface LogActivityParams {
  fanId: string;
  creatorId: string;
  activityType: ActivityType;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
}

/**
 * Log fan activity and send real-time notification to creator
 */
export async function logFanActivity({
  fanId,
  creatorId,
  activityType,
  targetId,
  targetType,
  metadata,
}: LogActivityParams): Promise<void> {
  if (!fanId || !creatorId || fanId === creatorId) return;

  try {
    // Log the activity
    await supabase.from('fan_activity').insert({
      fan_id: fanId,
      creator_id: creatorId,
      activity_type: activityType,
      target_id: targetId || null,
      target_type: targetType || null,
      metadata: metadata || null,
    });

    // Get fan profile for notification
    const { data: fanProfile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', fanId)
      .single();

    const fanUsername = fanProfile?.username || 'A fan';

    // Build notification based on activity type
    const notificationMap: Record<ActivityType, { title: string; body: string } | null> = {
      profile_view: {
        title: '👀 Profile View',
        body: `@${fanUsername} is viewing your profile right now`,
      },
      post_view: {
        title: '📸 Post View',
        body: `@${fanUsername} viewed your post${metadata?.postTitle ? ` "${metadata.postTitle}"` : ''}`,
      },
      ppv_view_no_purchase: {
        title: '💎 Hot Lead!',
        body: `@${fanUsername} viewed your PPV content but hasn't purchased yet — send them a DM!`,
      },
      subscriber_view_no_sub: {
        title: '⭐ Potential Subscriber',
        body: `@${fanUsername} viewed your subscriber content but isn't subscribed yet`,
      },
      ppv_purchase: {
        title: '💰 PPV Purchased!',
        body: `@${fanUsername} just purchased your PPV content`,
      },
      subscription_start: {
        title: '🎉 New Subscriber!',
        body: `@${fanUsername} just subscribed to you`,
      },
      subscription_cancel: {
        title: '😢 Subscription Cancelled',
        body: `@${fanUsername} cancelled their subscription`,
      },
      message_sent: null, // Stream handles message notifications
      comment: {
        title: '💬 New Comment',
        body: `@${fanUsername} commented on your post`,
      },
      reaction: {
        title: '❤️ New Reaction',
        body: `@${fanUsername} reacted to your post`,
      },
      review: {
        title: '⭐ New Review',
        body: `@${fanUsername} left you a review`,
      },
    };

    const notification = notificationMap[activityType];
    if (!notification) return;

    await supabase.from('notifications').insert({
      user_id: creatorId,
      type: activityType === 'subscription_start' ? 'new_subscriber'
        : activityType === 'ppv_purchase' ? 'ppv_unlocked'
        : activityType === 'review' ? 'new_subscriber'
        : 'like',
      title: notification.title,
      body: notification.body,
      actor_id: fanId,
      target_id: targetId || null,
      target_type: targetType || null,
      read: false,
    });
  } catch (err) {
    console.error('logFanActivity error:', err);
  }
}

/**
 * Get fan activity summary for creator dashboard
 */
export async function getFanActivitySummary(creatorId: string) {
  const { data } = await supabase
    .from('fan_activity')
    .select('*')
    .eq('creator_id', creatorId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  return data || [];
}
