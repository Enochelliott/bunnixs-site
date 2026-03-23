'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

// Supabase client lives outside component — never recreated
const supabase = createSupabaseBrowserClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const fetchingProfile = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    // Prevent concurrent fetches
    if (fetchingProfile.current) return;
    fetchingProfile.current = true;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data || null);
    } catch {
      setProfile(null);
    } finally {
      fetchingProfile.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) await fetchProfile(currentUser.id);
  }, [fetchProfile]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Safety timeout — never hang forever
    const timeout = setTimeout(() => setLoading(false), 5000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore duplicate events
        if (event === 'INITIAL_SESSION') return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  }, []);

  // Memoize context value — prevents all consumers re-rendering on unrelated state changes
  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    refreshProfile,
    signOut,
  }), [user, session, profile, loading, refreshProfile, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
