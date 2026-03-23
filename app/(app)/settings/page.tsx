'use client';

import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast('Signed out. See you soon! 🐰', { icon: '👋' });
  };

  const handleCopyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast.success('User ID copied!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient">Settings</h1>
        <p className="text-bunni-muted text-sm mt-1">Manage your BunniX account</p>
      </div>

      <div className="space-y-4">
        {/* Account info */}
        <div className="bg-bunni-card border border-bunni-border rounded-2xl p-6">
          <h2 className="font-semibold mb-4 text-bunni-text">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-bunni-border">
              <div>
                <p className="text-sm font-mono text-bunni-muted uppercase tracking-widest text-xs mb-0.5">Email</p>
                <p className="text-sm text-bunni-text">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-bunni-border">
              <div>
                <p className="text-sm font-mono text-bunni-muted uppercase tracking-widest text-xs mb-0.5">Username</p>
                <p className="text-sm text-bunni-text font-mono">@{profile?.username}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-mono text-bunni-muted uppercase tracking-widest text-xs mb-0.5">User ID</p>
                <p className="text-xs text-bunni-muted font-mono truncate max-w-xs">{user?.id}</p>
              </div>
              <button
                onClick={handleCopyUserId}
                className="text-xs text-bunni-muted hover:text-bunni-pink transition-colors font-mono px-3 py-1.5 rounded-lg border border-bunni-border hover:border-bunni-pink"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-bunni-card border border-bunni-border rounded-2xl p-6">
          <h2 className="font-semibold mb-3 text-bunni-text">Privacy</h2>
          <p className="text-sm text-bunni-muted leading-relaxed">
            Your feed is completely private. Only you can see your posts.
            Messages are end-to-end encrypted via GetStream.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-bunni-lime"></span>
            <span className="text-xs font-mono text-bunni-lime">Private feed enabled</span>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-bunni-card border border-red-500/20 rounded-2xl p-6">
          <h2 className="font-semibold mb-3 text-red-400">Sign Out</h2>
          <p className="text-sm text-bunni-muted mb-4">
            You can sign back in anytime with your magic link.
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all font-mono"
          >
            Sign out →
          </button>
        </div>
      </div>
    </div>
  );
}
