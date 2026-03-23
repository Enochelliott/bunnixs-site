# 🐰 BunniX

A private social platform built with **Next.js 14**, **Supabase**, and **GetStream**.

## Features

- 🔗 **Magic Link auth** via Supabase (no passwords)
- 👤 **Username onboarding** with real-time availability check
- 📸 **Private feed** — post text, images, and videos (up to 4 per post)
- 💬 **Direct Messages** via GetStream Chat (fully real-time)
- 🖼️ **Profile editor** — avatar, cover photo, bio, display name
- 🔒 **Row-level security** — your posts are visible only to you

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| Auth | Supabase Magic Link |
| Database | Supabase Postgres + RLS |
| File Storage | Supabase Storage |
| Messaging | GetStream Chat |
| Styling | Tailwind CSS |

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd bunnix
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **Settings → API** → copy `Project URL` and `anon key` and `service_role key`
3. Run the SQL schema in **SQL Editor**:
   - Paste the contents of `supabase/schema.sql` and run it

### 3. Create Supabase Storage buckets

In the **Supabase Dashboard → Storage**, create 3 public buckets:
- `avatars` (public)
- `covers` (public)
- `posts` (public)

For each bucket, add these storage policies (via **Policies** tab):

**SELECT policy** (all buckets):
```sql
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'BUCKET_NAME');
```

**INSERT policy** (all buckets):
```sql
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'BUCKET_NAME' AND auth.uid() IS NOT NULL
);
```

### 4. Create a GetStream account

1. Go to [getstream.io](https://getstream.io) → Create app
2. Select **Chat** product
3. Copy the **API Key** and **API Secret**

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_STREAM_API_KEY=xxxxxxxx
STREAM_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 6. Configure Supabase Auth redirect

In **Supabase Dashboard → Auth → URL Configuration**, add to **Redirect URLs**:
```
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

### 7. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## File Structure

```
bunnix/
├── app/
│   ├── page.tsx                  # Login (magic link)
│   ├── onboarding/page.tsx       # Username picker
│   ├── auth/callback/route.ts    # Supabase OAuth callback
│   ├── api/
│   │   └── stream/token/route.ts # GetStream token endpoint
│   └── (app)/                    # Protected app routes
│       ├── layout.tsx            # Sidebar nav + auth guard
│       ├── feed/page.tsx         # Main private feed
│       ├── messages/page.tsx     # DMs via GetStream
│       ├── profile/page.tsx      # Profile editor
│       └── settings/page.tsx     # Account settings
├── components/
│   ├── PostComposer.tsx          # Create posts with media
│   └── PostCard.tsx              # Display post with likes
├── contexts/
│   └── AuthContext.tsx           # Supabase auth state
├── lib/
│   ├── supabase.ts               # Supabase clients
│   ├── stream.ts                 # GetStream client
│   └── types.ts                  # TypeScript types
└── supabase/
    └── schema.sql                # Database schema
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add all env vars in Vercel project settings
4. Deploy!

---

## Stage 2 Ideas

- [ ] Follow system (public feeds)
- [ ] Comments on posts
- [ ] Stories / ephemeral content
- [ ] Notifications
- [ ] Search users
- [ ] Post bookmarks
