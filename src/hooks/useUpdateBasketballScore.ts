"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBasketballScore } from "@/actions/livescore/basketball-update";

interface UpdateScoreParams {
  matchId: string;
  teamId: string;
  playerId: string;
  points: number;
  rebounds: number;
  assists: number;
  threePointsMade: number;
  threePointsAttempted: number;
}

interface PlayerScore {
  player_id: number;
  team_id: number;
  match_id: number;
  points: number;
  rebounds: number;
  assists: number;
  three_points_made: number;
  three_points_attempted: number;
}

export function useUpdateBasketballScore(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['update-basketball-score'],
    
    mutationFn: async (params: UpdateScoreParams) => {
      console.log('🔵 [MUTATION FN] Starting mutation with params:', {
        playerId: params.playerId,
        points: params.points,
        rebounds: params.rebounds,
        assists: params.assists,
        timestamp: new Date().toISOString()
      });

      const result = await updateBasketballScore(
        params.matchId,
        params.teamId,
        params.playerId,
        params.points,
        params.rebounds,
        params.assists,
        params.threePointsMade,
        params.threePointsAttempted
      );

      console.log('🔵 [MUTATION FN] Server action result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update score');
      }

      return result.data;
    },

    onMutate: async (params) => {
      console.log('🟡 [ON MUTATE] Optimistic update starting:', {
        playerId: params.playerId,
        incrementPoints: params.points,
        incrementRebounds: params.rebounds,
        incrementAssists: params.assists,
      });

      await queryClient.cancelQueries({ queryKey: ["basketball-scores", matchId] });

      const previousScores = queryClient.getQueryData<PlayerScore[]>(["basketball-scores", matchId]);
      console.log('🟡 [ON MUTATE] Previous scores snapshot:', previousScores?.length || 0, 'players');

      queryClient.setQueryData<PlayerScore[]>(["basketball-scores", matchId], (old = []) => {
        const existingIndex = old.findIndex(
          score => score.player_id === parseInt(params.playerId) && 
                   score.team_id === parseInt(params.teamId)
        );

        if (existingIndex >= 0) {
          const oldScore = old[existingIndex];
          console.log('🟡 [ON MUTATE] Found existing player:', {
            playerId: params.playerId,
            oldPoints: oldScore.points,
            incrementBy: params.points,
            newPoints: oldScore.points + params.points,
          });

          const updated = [...old];
          updated[existingIndex] = {
            ...updated[existingIndex],
            points: updated[existingIndex].points + params.points,
            rebounds: updated[existingIndex].rebounds + params.rebounds,
            assists: updated[existingIndex].assists + params.assists,
            three_points_made: updated[existingIndex].three_points_made + params.threePointsMade,
            three_points_attempted: updated[existingIndex].three_points_attempted + params.threePointsAttempted,
          };
          return updated;
        } else {
          console.log('🟡 [ON MUTATE] Adding NEW player entry:', params.playerId);
          return [
            ...old,
            {
              player_id: parseInt(params.playerId),
              team_id: parseInt(params.teamId),
              match_id: parseInt(params.matchId),
              points: params.points,
              rebounds: params.rebounds,
              assists: params.assists,
              three_points_made: params.threePointsMade,
              three_points_attempted: params.threePointsAttempted,
            },
          ];
        }
      });

      console.log('🟡 [ON MUTATE] Optimistic update complete');
      return { previousScores };
    },

    onError: (error, params, context) => {
      console.error('🔴 [ON ERROR] Mutation failed:', {
        error: error.message,
        playerId: params.playerId,
        willRollback: !!context?.previousScores,
      });
      
      if (context?.previousScores) {
        console.log('🔴 [ON ERROR] Rolling back to previous state');
        queryClient.setQueryData(["basketball-scores", matchId], context.previousScores);
      }
    },

    onSuccess: (data, params) => {
      console.log('🟢 [ON SUCCESS] Mutation succeeded:', {
        playerId: params.playerId,
        serverResponse: data,
        timestamp: new Date().toISOString(),
      });
    },

    onSettled: (data, error, params) => {
      console.log('⚪ [ON SETTLED] Mutation settled (completed):', {
        playerId: params.playerId,
        hasError: !!error,
        timestamp: new Date().toISOString(),
      });
    },
  });
}

// Hook to check mutation queue status
export function useMutationQueueStatus() {
  const queryClient = useQueryClient();
  const mutationCache = queryClient.getMutationCache();
  
  const allMutations = mutationCache.getAll();
  const pausedMutations = allMutations.filter(m => m.state.isPaused);
  const pendingMutations = allMutations.filter(m => m.state.status === 'pending');
  
  console.log('📊 [QUEUE STATUS]', {
    total: allMutations.length,
    paused: pausedMutations.length,
    pending: pendingMutations.length,
    statuses: allMutations.map(m => m.state.status),
  });
  
  return {
    queueLength: pausedMutations.length,
    isPaused: pausedMutations.length > 0,
  };
}