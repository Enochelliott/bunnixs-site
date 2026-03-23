-- ============================================
-- BUNNIX COMPLETE SCHEMA v2
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,

  -- Role system
  role TEXT NOT NULL DEFAULT 'fan' CHECK (role IN ('fan', 'creator')),

  -- Creator specific fields
  gender_identity TEXT CHECK (gender_identity IN ('male', 'female', 'trans_male', 'trans_female', 'non_binary', 'other')),
  content_categories TEXT[] DEFAULT '{}',
  content_rating TEXT CHECK (content_rating IN ('softcore', 'explicit', 'fetish')),
  languages TEXT[] DEFAULT '{}',
  body_type TEXT,
  ethnicity TEXT,
  subscription_price DECIMAL(10,2),
  is_verified_creator BOOLEAN DEFAULT false,
  veriff_creator_session_id TEXT,
  veriff_creator_status TEXT DEFAULT 'pending' CHECK (veriff_creator_status IN ('pending', 'approved', 'declined', 'resubmit')),

  -- Fan specific fields
  interested_in TEXT[] DEFAULT '{}',
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_formats TEXT[] DEFAULT '{}',
  budget_range TEXT CHECK (budget_range IN ('free', 'under_20', '20_to_50', '50_plus', 'unlimited')),
  show_explicit BOOLEAN DEFAULT false,
  veriff_fan_session_id TEXT,
  veriff_fan_status TEXT DEFAULT 'pending' CHECK (veriff_fan_status IN ('pending', 'approved', 'declined', 'resubmit')),
  age_verified BOOLEAN DEFAULT false,

  -- Geo/compliance
  last_known_country TEXT,
  last_known_state TEXT,
  radar_user_id TEXT,

  -- Refund tracking
  refund_count INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'refunded')),

  -- Pricing
  creator_price DECIMAL(10,2) NOT NULL,
  fan_paid DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  processor_fee DECIMAL(10,2) NOT NULL,

  -- CCBill
  ccbill_subscription_id TEXT,
  ccbill_transaction_id TEXT,

  -- Dates
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(fan_id, creator_id)
);

-- ============================================
-- POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_types TEXT[] DEFAULT '{}',

  -- Visibility
  visibility TEXT NOT NULL DEFAULT 'subscribers' CHECK (visibility IN ('free', 'subscribers', 'ppv')),
  ppv_price DECIMAL(10,2),

  -- Metadata
  is_pinned BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POST LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- PPV PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS public.ppv_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  creator_price DECIMAL(10,2) NOT NULL,
  fan_paid DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  processor_fee DECIMAL(10,2) NOT NULL,

  ccbill_transaction_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
  viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, fan_id)
);

-- ============================================
-- TIPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,

  creator_amount DECIMAL(10,2) NOT NULL,
  fan_paid DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  processor_fee DECIMAL(10,2) NOT NULL,

  message TEXT,
  ccbill_transaction_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATOR EARNINGS WALLET
-- ============================================
CREATE TABLE IF NOT EXISTS public.creator_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  pending_balance DECIMAL(10,2) DEFAULT 0,
  available_balance DECIMAL(10,2) DEFAULT 0,
  processing_balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_paid_out DECIMAL(10,2) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WALLET TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('subscription', 'ppv', 'tip', 'payout', 'refund', 'chargeback')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid_out', 'refunded')),
  description TEXT,

  reference_id UUID,
  reference_type TEXT,

  available_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYOUTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('usdc', 'ach', 'wire', 'paxum', 'wise', 'check')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  wallet_address TEXT,
  bank_details JSONB,
  trolley_payment_id TEXT,

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REFUNDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('subscription', 'ppv', 'tip')),
  reference_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  refund_count_at_time INTEGER,

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTENT VIEWS LOG (for chargeback evidence)
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  radar_location JSONB,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GEO COMPLIANCE LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.geo_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  country TEXT,
  state TEXT,
  is_strict_jurisdiction BOOLEAN DEFAULT false,
  verification_required BOOLEAN DEFAULT false,
  radar_response JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppv_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_checks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- POSTS POLICIES
-- ============================================

-- Free posts visible to everyone
CREATE POLICY "Free posts are public" ON public.posts
  FOR SELECT USING (visibility = 'free');

-- Creator can always see their own posts
CREATE POLICY "Creators see own posts" ON public.posts
  FOR SELECT USING (auth.uid() = user_id);

-- Subscribers can see subscriber posts
CREATE POLICY "Subscribers see subscriber posts" ON public.posts
  FOR SELECT USING (
    visibility = 'subscribers' AND
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE fan_id = auth.uid()
      AND creator_id = posts.user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- PPV buyers can see PPV posts
CREATE POLICY "PPV buyers see ppv posts" ON public.posts
  FOR SELECT USING (
    visibility = 'ppv' AND
    EXISTS (
      SELECT 1 FROM public.ppv_purchases
      WHERE fan_id = auth.uid()
      AND post_id = posts.id
      AND status = 'completed'
    )
  );

CREATE POLICY "Creators can insert posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creators can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Creators can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);
CREATE POLICY "Fans can insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- ============================================
-- PPV PURCHASES POLICIES
-- ============================================
CREATE POLICY "Users can view own ppv purchases" ON public.ppv_purchases FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);
CREATE POLICY "Fans can insert ppv purchases" ON public.ppv_purchases FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- ============================================
-- TIPS POLICIES
-- ============================================
CREATE POLICY "Users can view own tips" ON public.tips FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);
CREATE POLICY "Fans can insert tips" ON public.tips FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- ============================================
-- WALLET POLICIES
-- ============================================
CREATE POLICY "Creators can view own wallet" ON public.creator_wallets FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can view own payouts" ON public.payouts FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can insert payout requests" ON public.payouts FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- REFUNDS POLICIES
-- ============================================
CREATE POLICY "Users can view own refunds" ON public.refunds FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);
CREATE POLICY "Fans can request refunds" ON public.refunds FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- ============================================
-- CONTENT VIEWS POLICIES
-- ============================================
CREATE POLICY "Users can insert own views" ON public.content_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creators can see views on their content" ON public.content_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
  );

-- ============================================
-- POST LIKES POLICIES
-- ============================================
CREATE POLICY "Users can view own likes" ON public.post_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- AUTO UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTO CREATE WALLET WHEN CREATOR PROFILE MADE
-- ============================================
CREATE OR REPLACE FUNCTION create_creator_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'creator' AND (OLD IS NULL OR OLD.role != 'creator') THEN
    INSERT INTO public.creator_wallets (creator_id)
    VALUES (NEW.id)
    ON CONFLICT (creator_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_create_creator_wallet
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_creator_wallet();

-- ============================================
-- MAKE WALLET FUNDS AVAILABLE AFTER 7 DAYS
-- ============================================
CREATE OR REPLACE FUNCTION release_pending_funds()
RETURNS void AS $$
BEGIN
  -- Move pending wallet transactions to available after 7 days
  UPDATE public.wallet_transactions
  SET status = 'available'
  WHERE status = 'pending'
  AND available_at <= NOW();

  -- Update creator wallet balances
  UPDATE public.creator_wallets cw
  SET
    pending_balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.wallet_transactions
      WHERE creator_id = cw.creator_id AND status = 'pending'
    ),
    available_balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.wallet_transactions
      WHERE creator_id = cw.creator_id AND status = 'available'
    );
END;
$$ language 'plpgsql';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_visibility_idx ON public.posts(visibility);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_fan_id_idx ON public.subscriptions(fan_id);
CREATE INDEX IF NOT EXISTS subscriptions_creator_id_idx ON public.subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS ppv_purchases_fan_id_idx ON public.ppv_purchases(fan_id);
CREATE INDEX IF NOT EXISTS ppv_purchases_post_id_idx ON public.ppv_purchases(post_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_creator_id_idx ON public.wallet_transactions(creator_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_status_idx ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS content_views_post_id_idx ON public.content_views(post_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Auth upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth update covers" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete covers" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read posts" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Auth upload posts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth update posts" ON storage.objects FOR UPDATE USING (bucket_id = 'posts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete posts" ON storage.objects FOR DELETE USING (bucket_id = 'posts' AND auth.uid() IS NOT NULL);

-- ============================================
-- SCHEMA ADDITIONS v3
-- Run these in Supabase SQL Editor
-- ============================================

-- ── Extended categories on profiles ─────────
-- Add ethnicity column for discover filtering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ethnicity TEXT;

-- ── Post reports table ───────────────────────
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('illegal_content', 'underage', 'non_consensual', 'spam', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can submit a report
CREATE POLICY "Logged in users can report posts" ON public.post_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only service role can read/update reports (admin dashboard uses service key)
CREATE POLICY "Service role reads reports" ON public.post_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Index for admin dashboard query
CREATE INDEX IF NOT EXISTS post_reports_status_idx ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS post_reports_post_id_idx ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS post_reports_created_at_idx ON public.post_reports(created_at DESC);

-- ── Update STRICT_STATES to full 25-state list ──
-- (This is just a reminder — update lib/types.ts, not the DB)
