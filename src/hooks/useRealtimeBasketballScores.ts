"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, useQuery, useIsMutating } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MatchScores {
  teamA: number;
  teamB: number;
  teamAId: string;
  teamBId: string;
}

/**
 * Realtime hook WITH mutation blocking - for LIVE SCORE EDITING pages
 * This prevents realtime from interfering with optimistic updates during rapid clicks
 */
export function useRealtimeBasketballScores(matchId: string) {
  const queryClient = useQueryClient();
  // Track if mutations are in progress - if so, ignore realtime updates
  const isMutating = useIsMutating();
  const pendingRealtimeUpdates = useRef(0);

  // 1️⃣ Fetch initial scores data using React Query
  const { data: scores = [], isLoading: isLoadingScores } = useQuery({
    queryKey: ["basketball-scores", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("basketball_scores")
        .select('*')
        .eq('match_id', matchId);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000, // Prevent excessive refetching
    refetchOnWindowFocus: false, // Realtime handles updates
  });

  // 2️⃣ Fetch initial match data using React Query
  const { data: matchData, isLoading: isLoadingMatch } = useQuery({
    queryKey: ["match-scores", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('team_a_score, team_b_score, team_a_id, team_b_id')
        .eq('id', matchId)
        .single();
      
      if (error) throw error;
      
      return {
        teamA: data?.team_a_score || 0,
        teamB: data?.team_b_score || 0,
        teamAId: data?.team_a_id?.toString() || '',
        teamBId: data?.team_b_id?.toString() || '',
      } as MatchScores;
    },
  });

  // 3️⃣ Subscribe to realtime changes - but PAUSE when mutations are active
  useEffect(() => {
    const scoresChannel = supabase 
      .channel(`basketball_scores:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'basketball_scores',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log("📡 Realtime basketball scores update received", payload);
          
          // ❌ Don't invalidate if mutations are in progress
          const mutationsInProgress = queryClient.isMutating() > 0;
          if (mutationsInProgress) {
            console.log("⏸️ Ignoring realtime update - mutations in progress");
            pendingRealtimeUpdates.current++;
            return;
          }
          
          console.log("✅ Applying realtime update");
          queryClient.invalidateQueries({
            queryKey: ["basketball-scores", matchId],
          });
        }
      )
      .subscribe();

    const matchChannel = supabase 
      .channel(`matches:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          console.log("📡 Realtime match update received", payload);
          
          // ❌ Don't invalidate if mutations are in progress
          const mutationsInProgress = queryClient.isMutating() > 0;
          if (mutationsInProgress) {
            console.log("⏸️ Ignoring realtime update - mutations in progress");
            return;
          }
          
          console.log("✅ Applying realtime update");
          queryClient.invalidateQueries({
            queryKey: ["match-scores", matchId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scoresChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, queryClient]);

  // 4️⃣ When mutations complete, apply any pending realtime updates
  useEffect(() => {
    if (isMutating === 0 && pendingRealtimeUpdates.current > 0) {
      console.log(`✅ Mutations completed - applying ${pendingRealtimeUpdates.current} pending realtime updates`);
      pendingRealtimeUpdates.current = 0;
      
      // Refetch to get latest server data
      queryClient.invalidateQueries({
        queryKey: ["basketball-scores", matchId],
      });
      queryClient.invalidateQueries({
        queryKey: ["match-scores", matchId],
      });
    }
  }, [isMutating, matchId, queryClient]);

  // ❌ Removed setScores and setMatchScores - no longer needed
  // React Query manages the cache automatically via invalidateQueries

  return {
    scores: scores || [],
    matchScores: matchData || { teamA: 0, teamB: 0, teamAId: '', teamBId: '' },
    teamAId: matchData?.teamAId || '',
    teamBId: matchData?.teamBId || '',
    isLoading: isLoadingScores || isLoadingMatch,
  };
}
