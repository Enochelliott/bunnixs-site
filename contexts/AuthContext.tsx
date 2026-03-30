'use client';

import {
  createContext, useContext, useEffect,
  useState, useCallback, useRef, useMemo,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileChecked: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null,
  loading: true, profileChecked: false,
  refreshProfile: async () => {}, signOut: async () => {},
});

const supabase = createSupabaseBrowserClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const initialized = useRef(false);
  const fetchingProfile = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingProfile.current) return;
    fetchingProfile.current = true;
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      setProfile(data || null);
    } catch {
      setProfile(null);
    } finally {
      fetchingProfile.current = false;
      setProfileChecked(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) await fetchProfile(currentUser.id);
  }, [fetchProfile]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const timeout = setTimeout(() => {
      setLoading(false);
      setProfileChecked(true);
    }, 8000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfileChecked(true);
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
      setProfileChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfileChecked(false);
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileChecked(true);
        }
        setLoading(false);
      }
    );

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) { setSession(session); setUser(session.user); }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null); setUser(null); setSession(null); setProfileChecked(false);
  }, []);

  const value = useMemo(() => ({
    user, session, profile, loading, profileChecked, refreshProfile, signOut,
  }), [user, session, profile, loading, profileChecked, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
