import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { demoProfiles } from '../lib/demoData';
import { getAppBaseUrl, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Profile } from '../types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isDemo: boolean;
  loading: boolean;
  authMessage: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => void;
};

const demoProfile = demoProfiles[0];

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(isSupabaseConfigured ? null : demoProfile);
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authMessage, setAuthMessage] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabase ist nicht konfiguriert. FilamentVault laeuft mit lokalen Demo-Daten.'
  );

  const loadProfile = useCallback(async (userId: string, email?: string | null) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (error) {
      setAuthMessage(error.message);
      setProfile({
        id: userId,
        email: email || null,
        full_name: email || 'Profil',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return;
    }

    setProfile(
      data || {
        id: userId,
        email: email || null,
        full_name: email || 'Profil',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        setAuthMessage(error.message);
      }

      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email);
      }
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsDemo(false);
      if (nextSession?.user) {
        loadProfile(nextSession.user.id, nextSession.user.email);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setIsDemo(true);
      setProfile(demoProfile);
      return;
    }

    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) {
      setIsDemo(true);
      setProfile(demoProfile);
      return;
    }

    setAuthMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppBaseUrl(),
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      setAuthMessage('Registrierung erfolgreich. Bitte bestaetige deine E-Mail und melde dich danach an.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase || isDemo) {
      setIsDemo(true);
      setProfile(demoProfile);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }, [isDemo]);

  const startDemo = useCallback(() => {
    setIsDemo(true);
    setProfile(demoProfile);
    setAuthMessage('Demo-Modus aktiv. Aenderungen bleiben in dieser Browser-Sitzung.');
  }, []);

  return useMemo(
    () => ({
      session,
      profile,
      isDemo,
      loading,
      authMessage,
      signIn,
      signUp,
      signOut,
      startDemo
    }),
    [authMessage, isDemo, loading, profile, session, signIn, signOut, signUp, startDemo]
  );
}
