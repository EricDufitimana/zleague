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
      console.log('🔍 [FETCH] Fetching scores from database...');
      const { data, error } = await supabase
        .from("basketball_scores")
        .select('*')
        .eq('match_id', matchId);
      
      if (error) throw error;
      console.log('🔍 [FETCH] Fetched', data?.length || 0, 'scores');
      return data || [];
    },
    staleTime: 10000, // ✅ Increased to 10 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // ✅ Don't auto-refetch on reconnect
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
    staleTime: 10000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const safeInvalidate = (queryKey: string[]) => {
      // ✅ Check queue status with blockRealtime flag
      const queueStatus = queryClient.getQueryData<{
        processing: boolean;
        lastCompleted: number;
        blockRealtime: boolean;
        queueLength: number;
      }>(['queue-status', matchId]);
      
      // ✅ CRITICAL: Check if realtime is blocked by queue
      if (queueStatus?.blockRealtime) {
        console.log(`🔔 [REALTIME] 🚫 BLOCKED by queue (${queueStatus.queueLength} items processing)`);
        
        // Retry after queue finishes
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(queryKey);
        }, 1000);
        return;
      }

      // ✅ Check if queue just finished
      const timeSinceQueueFinished = Date.now() - (queueStatus?.lastCompleted || 0);
      
      if (queueStatus?.lastCompleted && timeSinceQueueFinished < 1000) {
        console.log(`🔔 [REALTIME] ⏸️  Queue just finished (${timeSinceQueueFinished}ms ago), waiting...`);
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(queryKey);
        }, 1000 - timeSinceQueueFinished);
        return;
      }

      console.log(`🔔 [REALTIME] ✅ SAFE TO INVALIDATE ${queryKey[0]}`);
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
        console.log("🔔 [REALTIME] Score change detected from database");
        
        clearTimeout(pendingInvalidationRef.current);
        
        // ✅ Longer debounce to let queue finish
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(['basketball-scores', matchId]);
        }, 1500);
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
        console.log("🔔 [REALTIME] Match change detected from database");
        
        clearTimeout(pendingInvalidationRef.current);
        
        pendingInvalidationRef.current = setTimeout(() => {
          safeInvalidate(['match-scores', matchId]);
        }, 1500);
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