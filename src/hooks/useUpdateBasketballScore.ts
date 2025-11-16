import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBasketballScore } from '@/actions/livescore/basketball-update';

interface UpdateBasketballScoreParams {
  matchId: string;
  teamId: string;
  playerId: string;
  points: number;
  rebounds: number;
  assists: number;
  threePointsMade: number;
  threePointsAttempted: number;
}

interface ScoreData {
  player_id: number | string;
  team_id: number | string;
  points: number;
  rebounds: number;
  assists: number;
  three_points_made?: number;
  three_points_attempted?: number;
}

interface MatchScoreData {
  teamA: number;
  teamB: number;
  teamAId: string;
  teamBId: string;
}

export function useUpdateBasketballScore(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateBasketballScoreParams) => {
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

      if (!result.success) {
        throw new Error(result.error || 'Failed to update score');
      }

      return result;
    },
    onMutate: async (params) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['basketball-scores', matchId] });
      await queryClient.cancelQueries({ queryKey: ['match-scores', matchId] });

      // Snapshot the previous values
      const previousScores = queryClient.getQueryData<ScoreData[]>(["basketball-scores", matchId]);
      const previousMatchScores = queryClient.getQueryData<MatchScoreData>(["match-scores", matchId]);

      // Optimistically update scores in React Query cache
      queryClient.setQueryData<ScoreData[]>(["basketball-scores", matchId], (old = []) =>
        old.map((score) =>
          score.player_id.toString() === params.playerId && 
          score.team_id.toString() === params.teamId
            ? {
                ...score,
                points: Number(score.points) + params.points,
                rebounds: Number(score.rebounds) + params.rebounds,
                assists: Number(score.assists) + params.assists,
                three_points_made: (Number(score.three_points_made) || 0) + params.threePointsMade,
                three_points_attempted: (Number(score.three_points_attempted) || 0) + params.threePointsAttempted,
              }
            : score
        )
      );

      // Optimistically update match scores in React Query cache
      queryClient.setQueryData<MatchScoreData>(["match-scores", matchId], (old) => {
        if (!old) return old;
        const teamAId = old.teamAId || '';
        const teamBId = old.teamBId || '';
        return {
          ...old,
          teamA: old.teamA + (params.teamId === teamAId ? params.points : 0),
          teamB: old.teamB + (params.teamId === teamBId ? params.points : 0),
        };
      });

      // Return context with previous values for rollback
      return { previousScores, previousMatchScores };
    },
    onError: (_err, _params, context) => {
      // Rollback optimistic updates on error
      if (context?.previousScores) {
        queryClient.setQueryData(["basketball-scores", matchId], context.previousScores);
      }
      if (context?.previousMatchScores) {
        queryClient.setQueryData(["match-scores", matchId], context.previousMatchScores);
      }
    },
    // ✅ Removed onSettled - we don't invalidate after each mutation
    // Instead, realtime will handle syncing when ALL mutations complete
  });
}
