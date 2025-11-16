"use client";

import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseRealtimeScoresOptions {
  matchId?: string;
  sportType: 'basketball' | 'football';
  enabled?: boolean;
}

/**
 * Pure realtime hook for read-only pages (main scores page, brackets, etc.)
 * No mutation blocking - always applies realtime updates immediately
 */
export function useRealtimeScoresReadOnly({ matchId, sportType, enabled = true }: UseRealtimeScoresOptions) {
  const queryClient = useQueryClient();
  const tableName = sportType === 'basketball' ? 'basketball_scores' : 'football_scores';

  // Fetch initial scores data
  const { data: scores = [], isLoading } = useQuery({
    queryKey: [`${sportType}-scores`, matchId],
    queryFn: async () => {
      if (!matchId) return [];
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('match_id', matchId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!matchId,
    refetchInterval: false, // Rely on realtime for updates
    refetchOnWindowFocus: false,
  });

  // Subscribe to realtime changes - PURE realtime, no blocking
  useEffect(() => {
    if (!matchId || !enabled) return;

    const channel = supabase 
      .channel(`${tableName}:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log(`✅ Pure realtime ${sportType} update:`, payload.eventType);
          
          // Immediately apply realtime updates
          queryClient.invalidateQueries({
            queryKey: [`${sportType}-scores`, matchId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, sportType, tableName, queryClient, enabled]);

  return {
    scores: scores || [],
    isLoading,
  };
}

/**
 * Hook to subscribe to ALL live match updates (for main scores page)
 */
export function useRealtimeAllMatches(sportType: 'basketball' | 'football' | 'all' = 'all') {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: any[] = [];

    // Subscribe to basketball scores if needed
    if (sportType === 'basketball' || sportType === 'all') {
      const basketballChannel = supabase
        .channel('basketball_scores_all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'basketball_scores',
          },
          (payload) => {
            console.log('✅ Basketball score updated:', payload);
            // Invalidate all basketball queries to refetch
            queryClient.invalidateQueries({
              queryKey: ['basketball-scores'],
            });
            // Also invalidate matches to update scores on main page
            queryClient.invalidateQueries({
              queryKey: ['matches'],
            });
          }
        )
        .subscribe();
      
      channels.push(basketballChannel);
    }

    // Subscribe to football scores if needed
    if (sportType === 'football' || sportType === 'all') {
      const footballChannel = supabase
        .channel('football_scores_all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'football_scores',
          },
          (payload) => {
            console.log('✅ Football score updated:', payload);
            // Invalidate all football queries to refetch
            queryClient.invalidateQueries({
              queryKey: ['football-scores'],
            });
            // Also invalidate matches to update scores on main page
            queryClient.invalidateQueries({
              queryKey: ['matches'],
            });
          }
        )
        .subscribe();
      
      channels.push(footballChannel);
    }

    // Subscribe to match updates (status changes, etc.)
    const matchChannel = supabase
      .channel('matches_all')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          console.log('✅ Match updated:', payload);
          queryClient.invalidateQueries({
            queryKey: ['matches'],
          });
        }
      )
      .subscribe();
    
    channels.push(matchChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [sportType, queryClient]);
}

