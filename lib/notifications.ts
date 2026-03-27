import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type NotificationType =
  | 'like'
  | 'comment'
  | 'new_subscriber'
  | 'new_post'
  | 'verification_approved'
  | 'verification_rejected'
  | 'co_creator_verified'
  | 'co_creator_rejected'
  | 'ppv_unlocked'
  | 'tip_received'
  | 'sale_started'
  | 'subscription_cancelled'
  | 'review_received';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actorId?: string;
  targetId?: string;
  targetType?: string;
}

export async function sendNotification({
  userId,
  type,
  title,
  body,
  actorId,
  targetId,
  targetType,
}: SendNotificationParams): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body || null,
      actor_id: actorId || null,
      target_id: targetId || null,
      target_type: targetType || null,
      read: false,
    });
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}

export async function sendNewSubscriberNotification(
  creatorId: string,
  fanId: string,
  fanUsername: string
): Promise<void> {
  await sendNotification({
    userId: creatorId,
    type: 'new_subscriber',
    title: '🎉 New Subscriber!',
    body: `@${fanUsername} just subscribed to you`,
    actorId: fanId,
    targetType: 'subscription',
  });
}

export async function sendNewPostNotification(
  subscriberIds: string[],
  creatorUsername: string,
  postId: string,
  postTitle?: string
): Promise<void> {
  if (!subscriberIds.length) return;
  const notifications = subscriberIds.map(userId => ({
    user_id: userId,
    type: 'new_post' as NotificationType,
    title: '✨ New Post',
    body: `@${creatorUsername} just posted${postTitle ? ` "${postTitle}"` : ' new content'}`,
    target_id: postId,
    target_type: 'post',
    read: false,
  }));
  await supabase.from('notifications').insert(notifications);
}

export async function sendSaleNotification(
  subscriberIds: string[],
  creatorUsername: string,
  discountPercent: number,
  saleId: string
): Promise<void> {
  if (!subscriberIds.length) return;
  const notifications = subscriberIds.map(userId => ({
    user_id: userId,
    type: 'sale_started' as NotificationType,
    title: '🔥 Sale Alert!',
    body: `@${creatorUsername} just launched a ${discountPercent}% off sale!`,
    target_id: saleId,
    target_type: 'sale',
    read: false,
  }));
  await supabase.from('notifications').insert(notifications);
}
