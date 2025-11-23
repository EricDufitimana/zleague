"use client";

import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateBasketballScore } from '@/actions/livescore/basketball-update';

interface QueuedUpdate {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  points: number;
  rebounds: number;
  assists: number;
  threePointsMade: number;
  threePointsAttempted: number;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
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
  __optimistic_version?: number; // ✅ Version tracking
}

export function useMutationQueue(matchId: string) {
  const queryClient = useQueryClient();
  const queueRef = useRef<QueuedUpdate[]>([]);
  const isProcessingRef = useRef(false);
  const versionRef = useRef<number>(Date.now()); // ✅ Global version counter

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const update = queueRef.current[0];

    console.log(`🔵 [QUEUE] Processing ${queueRef.current.length} items`);

    try {
      const result = await updateBasketballScore(
        update.matchId,
        update.teamId,
        update.playerId,
        update.points,
        update.rebounds,
        update.assists,
        update.threePointsMade,
        update.threePointsAttempted
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update score');
      }

      console.log(`✅ [QUEUE] Success for player ${update.playerId}`);
      update.resolve(result.data);
      queueRef.current.shift();
    } catch (error) {
      console.error(`❌ [QUEUE] Error:`, error);
      update.reject(error);
      queueRef.current.shift();
    } finally {
      isProcessingRef.current = false;

      if (queueRef.current.length > 0) {
        setTimeout(() => processQueue(), 100); // ✅ Increased to 100ms for safety
      } else {
        console.log('🎉 [QUEUE] All processed! Safe to invalidate now.');
        // ✅ Mark that queue is done - realtime can now invalidate
        queryClient.setQueryData(['queue-status', matchId], { 
          processing: false, 
          lastCompleted: Date.now() 
        });
      }
    }
  }, [matchId, queryClient]);

  const queueUpdate = useCallback((params: {
    teamId: string;
    playerId: string;
    points: number;
    rebounds: number;
    assists: number;
    threePointsMade: number;
    threePointsAttempted: number;
  }): Promise<any> => {
    return new Promise((resolve, reject) => {
      const update: QueuedUpdate = {
        id: `${Date.now()}-${params.playerId}`,
        matchId,
        ...params,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      queueRef.current.push(update);
      
      // ✅ Mark queue as processing
      queryClient.setQueryData(['queue-status', matchId], { 
        processing: true, 
        queueLength: queueRef.current.length 
      });

      console.log(`➕ [QUEUE] Added update, queue: ${queueRef.current.length}`);

      // ✅ Increment version for this update
      versionRef.current = Date.now();
      const currentVersion = versionRef.current;

      // ✅ Optimistic update WITH version
      queryClient.setQueryData<PlayerScore[]>(
        ["basketball-scores", matchId], 
        (old = []) => {
          const existingIndex = old.findIndex(
            score => score.player_id === parseInt(params.playerId) && 
                     score.team_id === parseInt(params.teamId)
          );

          if (existingIndex >= 0) {
            const updated = [...old];
            updated[existingIndex] = {
              ...updated[existingIndex],
              points: updated[existingIndex].points + params.points,
              rebounds: updated[existingIndex].rebounds + params.rebounds,
              assists: updated[existingIndex].assists + params.assists,
              three_points_made: updated[existingIndex].three_points_made + params.threePointsMade,
              three_points_attempted: updated[existingIndex].three_points_attempted + params.threePointsAttempted,
              __optimistic_version: currentVersion, // ✅ Tag with version
            };
            return updated;
          } else {
            return [
              ...old,
              {
                player_id: parseInt(params.playerId),
                team_id: parseInt(params.teamId),
                match_id: parseInt(matchId),
                points: params.points,
                rebounds: params.rebounds,
                assists: params.assists,
                three_points_made: params.threePointsMade,
                three_points_attempted: params.threePointsAttempted,
                __optimistic_version: currentVersion, // ✅ Tag with version
              },
            ];
          }
        }
      );

      processQueue();
    });
  }, [matchId, queryClient, processQueue]);

  const getQueueLength = useCallback(() => {
    return queueRef.current.length;
  }, []);

  const getLatestVersion = useCallback(() => {
    return versionRef.current;
  }, []);

  return {
    queueUpdate,
    getQueueLength,
    getLatestVersion,
    isProcessing: isProcessingRef.current,
  };
}