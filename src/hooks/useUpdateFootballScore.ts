import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateFootballScore } from '@/actions/livescore/football-update';

interface UpdateFootballScoreParams {
  matchId: string;
  teamId: string;
  playerId: string;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  saves: number;
}

interface ScoreData {
  player_id: number | string;
  team_id: number | string;
  goals: number;
  assists: number;
  shots_on_target?: number;
  saves?: number;
}

interface MatchScoreData {
  teamA: number;
  teamB: number;
  teamAId: string;
  teamBId: string;
}

export function useUpdateFootballScore(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateFootballScoreParams) => {
      const result = await updateFootballScore(
        params.matchId,
        params.teamId,
        params.playerId,
        params.goals,
        params.assists,
        params.shotsOnTarget,
        params.saves
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update score');
      }

      return result;
    },
    onMutate: async (params) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['football-scores', matchId] });
      await queryClient.cancelQueries({ queryKey: ['match-scores', matchId] });

      // Snapshot the previous values
      const previousScores = queryClient.getQueryData<ScoreData[]>(["football-scores", matchId]);
      const previousMatchScores = queryClient.getQueryData<MatchScoreData>(["match-scores", matchId]);

      // Optimistically update scores in React Query cache
      queryClient.setQueryData<ScoreData[]>(["football-scores", matchId], (old = []) =>
        old.map((score) =>
          score.player_id.toString() === params.playerId && 
          score.team_id.toString() === params.teamId
            ? {
                ...score,
                goals: Number(score.goals) + params.goals,
                assists: Number(score.assists) + params.assists,
                shots_on_target: (Number(score.shots_on_target) || 0) + params.shotsOnTarget,
                saves: (Number(score.saves) || 0) + params.saves,
              }
            : score
        )
      );

      // Optimistically update match scores in React Query cache (only goals count)
      queryClient.setQueryData<MatchScoreData>(["match-scores", matchId], (old) => {
        if (!old) return old;
        const teamAId = old.teamAId || '';
        const teamBId = old.teamBId || '';
        return {
          ...old,
          teamA: old.teamA + (params.teamId === teamAId ? params.goals : 0),
          teamB: old.teamB + (params.teamId === teamBId ? params.goals : 0),
        };
      });

      // Return context with previous values for rollback
      return { previousScores, previousMatchScores };
    },
    onError: (_err, _params, context) => {
      // Rollback optimistic updates on error
      if (context?.previousScores) {
        queryClient.setQueryData(["football-scores", matchId], context.previousScores);
      }
      if (context?.previousMatchScores) {
        queryClient.setQueryData(["match-scores", matchId], context.previousMatchScores);
      }
    },
    onSettled: () => {
      // Invalidate queries to refetch latest data (realtime will also update it)
      queryClient.invalidateQueries({ queryKey: ['football-scores', matchId] });
      queryClient.invalidateQueries({ queryKey: ['match-scores', matchId] });
    },
  });
}
