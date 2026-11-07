'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
export function useLeagueAccount() {
  const [authId, setAuthId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const cache = useQueryClient();
  useEffect(() => {
    const client = createClient(); let active = true;
    client.auth.getSession().then(({ data }) => { if (active) { setAuthId(data.session?.user.id || null); setReady(true); } });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { setAuthId(session?.user.id || null); setReady(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const profile = useQuery<{ id: number; role: string; username: string; first_name: string; last_name: string }>({ queryKey: ['league-account', authId], enabled: !!authId, staleTime: 60000, retry: false,
    queryFn: async () => { const response = await fetch(`/api/user-profile?userId=${encodeURIComponent(authId!)}`); if (!response.ok) throw new Error('Your profile could not be loaded.'); return (await response.json()).user; },
  });
  const signOut = async () => { const { error } = await createClient().auth.signOut(); if (error) throw error; cache.removeQueries({ queryKey: ['league-account'] }); cache.removeQueries({ queryKey: ['my-predictions'] }); };
  return { authId, profile: profile.data, isAdmin: profile.data?.role === 'admin', ready, profileError: profile.isError, signOut };
}
