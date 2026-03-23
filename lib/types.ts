// ============================================
// BUNNIX TYPES v2
// ============================================

export type UserRole = 'fan' | 'creator';
export type PostVisibility = 'free' | 'subscribers' | 'ppv';
export type VeriffStatus = 'pending' | 'approved' | 'declined' | 'resubmit';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'refunded';
export type WalletTransactionType = 'subscription' | 'ppv' | 'tip' | 'payout' | 'refund' | 'chargeback';
export type PayoutMethod = 'usdc' | 'ach' | 'wire' | 'paxum' | 'wise' | 'check';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type MediaType = 'image' | 'video';
export type BudgetRange = 'free' | 'under_20' | '20_to_50' | '50_plus' | 'unlimited';
export type ContentRating = 'softcore' | 'explicit' | 'fetish';
export type GenderIdentity = 'male' | 'female' | 'trans_male' | 'trans_female' | 'non_binary' | 'other';

export const CONTENT_CATEGORIES = [
  'glamour', 'natural', 'amateur', 'cosplay', 'fantasy',
  'fetish', 'kink', 'artistic', 'fitness', 'lifestyle'
] as const;

export const CONTENT_FORMATS = [
  'photos', 'videos', 'live', 'custom', 'sexting'
] as const;

export const BODY_TYPES = [
  'petite', 'curvy', 'athletic', 'bbw', 'muscular', 'slim'
] as const;

// States requiring full ID verification before accessing adult content
// Last updated: March 2026 — 25 states active
// Add new states here when they pass laws — one line change
export const STRICT_STATES = [
  'LA', // Louisiana — Jan 2023
  'UT', // Utah — May 2023
  'VA', // Virginia — Jul 2023
  'AR', // Arkansas — Aug 2023
  'TX', // Texas — Sep 2023
  'MS', // Mississippi — Jul 2024
  'MT', // Montana — Jan 2024
  'NC', // North Carolina — Jan 2024
  'ID', // Idaho — Jul 2024
  'KS', // Kansas — Jul 2024
  'KY', // Kentucky — Jul 2024
  'NE', // Nebraska — Jul 2024
  'IN', // Indiana — Aug 2024
  'AL', // Alabama — Oct 2024
  'OK', // Oklahoma — Nov 2024
  'FL', // Florida — Jan 2025
  'SC', // South Carolina — Jan 2025
  'TN', // Tennessee — Jan 2025 (also requires re-verify every 60 min)
  'GA', // Georgia — Jul 2025
  'WY', // Wyoming — Jul 2025
  'SD', // South Dakota — Jul 2025
  'ND', // North Dakota — Aug 2025
  'AZ', // Arizona — Sep 2025
  'OH', // Ohio — Sep 2025
  'MO', // Missouri — Nov 2025
] as const;

// States that require re-verification every session (not just once)
export const REVERIFY_STATES = ['TN'] as const;

// Countries requiring full ID verification
// Countries requiring full ID verification
export const STRICT_COUNTRIES = ['GB', 'DE', 'FR', 'AU', 'NZ', 'IE', 'NO', 'FI', 'SE'] as const;
// Countries blocked entirely
export const BLOCKED_COUNTRIES = ['CN', 'RU', 'KP', 'IR', 'SA', 'AE', 'PK', 'BD', 'NG', 'EG', 'IQ', 'AF', 'SO', 'YE', 'LY', 'SD'] as const;
// States where one-click age confirm is sufficient
export const LENIENT_STATES = ['CA', 'NY', 'WA', 'OR', 'CO', 'NV', 'IL', 'MA', 'CT', 'NJ', 'MD', 'WI', 'MN', 'NH', 'VT', 'ME', 'RI', 'DE', 'HI', 'AK', 'NM', 'WV', 'PA', 'MI', 'IA', 'DC'] as const;

// Fee calculation constants
export const FEE_MULTIPLIER = 1.30; // Fan pays 30% more than creator price
export const PLATFORM_FEE_RATE = 0.08; // 8% platform fee
export const PROCESSOR_FEE_RATE = 0.11; // 11% CCBill fee
export const HOLDBACK_RATE = 0.11; // 11% bank holdback
export const PAYOUT_HOLD_DAYS = 7; // Days before earnings available

// Calculate what fan pays given creator price
export function calculateFanPrice(creatorPrice: number): number {
  return Math.round(creatorPrice * FEE_MULTIPLIER * 100) / 100;
}

// Calculate fee breakdown
export function calculateFees(fanPaid: number) {
  const processorFee = Math.round(fanPaid * PROCESSOR_FEE_RATE * 100) / 100;
  const afterProcessor = fanPaid - processorFee;
  const platformFee = Math.round(fanPaid * PLATFORM_FEE_RATE * 100) / 100;
  const creatorAmount = Math.round((afterProcessor - platformFee) * 100) / 100;
  return { processorFee, platformFee, creatorAmount };
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  role: UserRole;

  // Creator fields
  gender_identity: GenderIdentity | null;
  content_categories: string[];
  content_rating: ContentRating | null;
  languages: string[];
  body_type: string | null;
  ethnicity: string | null;
  subscription_price: number | null;
  is_verified_creator: boolean;
  veriff_creator_status: VeriffStatus;

  // Fan fields
  interested_in: string[];
  preferred_categories: string[];
  preferred_formats: string[];
  budget_range: BudgetRange | null;
  show_explicit: boolean;
  veriff_fan_status: VeriffStatus;
  age_verified: boolean;

  // Compliance
  last_known_country: string | null;
  last_known_state: string | null;
  is_banned: boolean;
  refund_count: number;

  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_urls: string[];
  media_types: MediaType[];
  visibility: PostVisibility;
  ppv_price: number | null;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  profile?: Partial<Profile>;
  likes_count?: number;
  liked_by_me?: boolean;
  is_purchased?: boolean;
  is_subscribed?: boolean;
}

export interface Subscription {
  id: string;
  fan_id: string;
  creator_id: string;
  status: SubscriptionStatus;
  creator_price: number;
  fan_paid: number;
  platform_fee: number;
  processor_fee: number;
  ccbill_subscription_id: string | null;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
}

export interface CreatorWallet {
  id: string;
  creator_id: string;
  pending_balance: number;
  available_balance: number;
  processing_balance: number;
  total_earned: number;
  total_paid_out: number;
}

export interface WalletTransaction {
  id: string;
  creator_id: string;
  type: WalletTransactionType;
  amount: number;
  status: string;
  description: string | null;
  available_at: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  method: PayoutMethod;
  status: PayoutStatus;
  requested_at: string;
  completed_at: string | null;
}

export interface Refund {
  id: string;
  fan_id: string;
  creator_id: string;
  type: string;
  reference_id: string;
  amount: number;
  reason: string | null;
  status: string;
  requested_at: string;
}

export interface UploadedMedia {
  url: string;
  type: MediaType;
  file?: File;
}

export interface GeoCheckResult {
  country: string;
  state: string;
  isStrictJurisdiction: boolean;
  verificationRequired: boolean;
}
