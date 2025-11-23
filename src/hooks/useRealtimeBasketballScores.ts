"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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

export function useRealtimeBasketballScores(matchId: string) {
  const queryClient = useQueryClient();
  const pendingInvalidationRef = useRef<NodeJS.Timeout>();

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
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

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
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    const safeInvalidate = (queryKey: string[]) => {
      // ✅ Check queue status
      const queueStatus = queryClient.getQueryData<{processing: boolean, lastCompleted: number}>(['queue-status', matchId]);
      
      if (queueStatus?.processing) {
        console.log('🔔 [REALTIME] ⏸️  Queue is processing, delaying invalidation');
        // Retry after queue finishes
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(queryKey);
        }, 1000);
        return;
      }

      // ✅ Only invalidate if queue finished recently OR hasn't run yet
      const timeSinceQueueFinished = Date.now() - (queueStatus?.lastCompleted || 0);
      
      if (timeSinceQueueFinished < 500) {
        console.log('🔔 [REALTIME] ⏸️  Queue just finished, waiting a bit...');
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(queryKey);
        }, 500);
        return;
      }

      console.log(`🔔 [REALTIME] ✅ INVALIDATING ${queryKey[0]}`);
      queryClient.invalidateQueries({ queryKey });
    };
  
    const scoresChannel = supabase 
      .channel(`basketball_scores:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'basketball_scores',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        console.log("🔔 [REALTIME] Score change detected");
        
        clearTimeout(pendingInvalidationRef.current);
        
        // ✅ Debounce and check queue status
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(['basketball-scores', matchId]);
        }, 1000); // Wait 1 second before invalidating
      })
      .subscribe();

    const matchChannel = supabase 
      .channel(`matches:${matchId}`)
      .on("postgres_changes", {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`
      }, (payload) => {
        console.log("🔔 [REALTIME] Match change detected");
        
        clearTimeout(pendingInvalidationRef.current);
        
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(['match-scores', matchId]);
        }, 1000);
      })
      .subscribe();

    return () => {
      clearTimeout(pendingInvalidationRef.current);
      supabase.removeChannel(scoresChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, queryClient]);

  return {
    scores: scores || [],
    matchScores: matchData || { teamA: 0, teamB: 0, teamAId: '', teamBId: '' },
    teamAId: matchData?.teamAId || '',
    teamBId: matchData?.teamBId || '',
    isLoading: isLoadingScores || isLoadingMatch,
  };
}