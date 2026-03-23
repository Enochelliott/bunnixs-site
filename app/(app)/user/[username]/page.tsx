'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';
const supabase = createSupabaseBrowserClient();
export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('profiles').select('*').eq('username', username.toLowerCase()).single()
      .then(({ data }) => {
        if (data?.role === 'creator') { router.replace(`/creator/${data.username}`); return; }
        setUser(data);
        setLoading(false);
      });
  }, [username, router]);
  if (loading) return <div className="flex items-center justify-center h-screen bg-bunni-dark"><div className="w-8 h-8 border-2 border-bunni-pink/30 border-t-bunni-pink rounded-full animate-spin" /></div>;
  if (!user) return <div className="flex items-center justify-center h-screen bg-bunni-dark"><p className="text-bunni-muted">User not found</p></div>;
  return (
    <div className="min-h-screen bg-bunni-dark">
      <div className="relative h-48 bg-gradient-to-br from-bunni-purple/30 to-bunni-pink/20">
        {user.cover_url && <Image src={user.cover_url} alt="" fill className="object-cover" sizes="100vw" />}
      </div>
      <div className="max-w-2xl mx-auto px-6">
        <div className="relative -mt-12 mb-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-bunni-dark bg-gradient-bunni shadow-xl">
            {user.avatar_url ? <Image src={user.avatar_url} alt={user.username} fill className="object-cover" sizes="96px" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">{user.username[0].toUpperCase()}</div>}
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold mb-1">{user.display_name || user.username}</h1>
        <p className="text-bunni-muted font-mono mb-4">@{user.username}</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-bunni-cyan/10 text-bunni-cyan border border-bunni-cyan/20">⭐ Fan</div>
        {user.bio && <p className="text-bunni-text/80 leading-relaxed mt-4">{user.bio}</p>}
        <div className="mt-6 py-4 border-t border-bunni-border">
          <p className="text-xs text-bunni-muted font-mono">Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}