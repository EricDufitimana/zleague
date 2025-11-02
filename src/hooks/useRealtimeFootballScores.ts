"use client";

import { useEffect } from "react";
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

export function useRealtimeFootballScores(matchId: string) {
  const queryClient = useQueryClient();

  // 1️⃣ Fetch initial scores data using React Query
  const { data: scores = [], isLoading: isLoadingScores } = useQuery({
    queryKey: ["football-scores", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("football_scores")
        .select('*')
        .eq('match_id', matchId);
      
      if (error) throw error;
      return data || [];
    },
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

  // 3️⃣ Subscribe to realtime changes and sync to React Query cache
  useEffect(() => {
    const scoresChannel = supabase 
      .channel(`football_scores:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'football_scores',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log("Realtime update received", payload);

          // Sync realtime updates to React Query cache
          queryClient.setQueryData(["football-scores", matchId], (old: any[] = []) => {
            if (payload.eventType === 'INSERT') {
              return [...old, payload.new];
            }
            if (payload.eventType === 'UPDATE') {
              return old.map((score) =>
                score.player_id === payload.new.player_id &&
                score.team_id === payload.new.team_id
                  ? payload.new
                  : score
              );
            }
            if (payload.eventType === 'DELETE') {
              return old.filter(
                (score) =>
                  !(score.player_id === payload.old.player_id &&
                    score.team_id === payload.old.team_id)
              );
            }
            return old;
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
          console.log("Match update received", payload);

          // Sync match updates to React Query cache
          queryClient.setQueryData(["match-scores", matchId], () => ({
            teamA: payload.new.team_a_score || 0,
            teamB: payload.new.team_b_score || 0,
            teamAId: payload.new.team_a_id?.toString() || '',
            teamBId: payload.new.team_b_id?.toString() || '',
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scoresChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, queryClient]);

  // Helper functions for backward compatibility (now just read from cache)
  const setScores = (updater: any) => {
    const current = queryClient.getQueryData<any[]>(["football-scores", matchId]) || [];
    const newValue = typeof updater === 'function' ? updater(current) : updater;
    queryClient.setQueryData(["football-scores", matchId], newValue);
  };

  const setMatchScores = (updater: any) => {
    const current = queryClient.getQueryData<MatchScores>(["match-scores", matchId]) || {
      teamA: 0,
      teamB: 0,
      teamAId: '',
      teamBId: '',
    };
    const newValue = typeof updater === 'function' ? updater(current) : updater;
    queryClient.setQueryData(["match-scores", matchId], newValue);
  };

  return {
    scores: scores || [],
    matchScores: matchData || { teamA: 0, teamB: 0, teamAId: '', teamBId: '' },
    teamAId: matchData?.teamAId || '',
    teamBId: matchData?.teamBId || '',
    setScores,
    setMatchScores,
    isLoading: isLoadingScores || isLoadingMatch,
  };
}
