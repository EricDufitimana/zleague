"use client";

import { useRef, useCallback, useEffect } from 'react';
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
  retryCount: number; // ✅ Track retries
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
  __optimistic_version?: number;
}

export function useMutationQueue(matchId: string) {
  const queryClient = useQueryClient();
  const queueRef = useRef<QueuedUpdate[]>([]);
  const isProcessingRef = useRef(false);
  const versionRef = useRef<number>(Date.now());
  const isOnlineRef = useRef(true);

  // ✅ Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [QUEUE] Back online - resuming queue processing');
      isOnlineRef.current = true;
      processQueue(); // Resume processing when back online
    };
    
    const handleOffline = () => {
      console.log('📡 [QUEUE] Offline - pausing queue processing');
      isOnlineRef.current = false;
    };

    isOnlineRef.current = navigator.onLine;
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    // ✅ Don't process if offline
    if (!isOnlineRef.current) {
      console.log('📡 [QUEUE] Offline - pausing until connection restored');
      return;
    }

    isProcessingRef.current = true;
    const update = queueRef.current[0];

    console.log(`🔵 [QUEUE] Processing ${queueRef.current.length} items (Retry: ${update.retryCount})`);

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
      
      // ✅ Only remove from queue on SUCCESS
      queueRef.current.shift();
      
    } catch (error: any) {
      console.error(`❌ [QUEUE] Error:`, error?.message);

      // ✅ Check if it's a network/connection error
      const isNetworkError = 
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('Server has closed') ||
        !navigator.onLine;

      if (isNetworkError) {
        // ✅ Network error - keep in queue and retry
        console.log(`🔄 [QUEUE] Network error - will retry (attempt ${update.retryCount + 1})`);
        update.retryCount++;
        
        // ✅ Max 10 retries to prevent infinite loops
        if (update.retryCount > 10) {
          console.error(`❌ [QUEUE] Max retries exceeded, removing from queue`);
          update.reject(new Error('Max retries exceeded'));
          queueRef.current.shift();
        }
        // Otherwise keep in queue for retry
        
      } else {
        // ✅ Business logic error - remove from queue
        console.error(`❌ [QUEUE] Non-network error, removing from queue`);
        update.reject(error);
        queueRef.current.shift();
      }
    } finally {
      isProcessingRef.current = false;

      // ✅ Continue processing if online and queue not empty
      if (queueRef.current.length > 0 && isOnlineRef.current) {
        console.log(`🔄 [QUEUE] ${queueRef.current.length} items remaining, continuing...`);
        setTimeout(() => processQueue(), 100);
      } else if (queueRef.current.length === 0) {
        console.log('🎉 [QUEUE] All processed!');
        queryClient.setQueryData(['queue-status', matchId], { 
          processing: false, 
          lastCompleted: Date.now() 
        });
      } else {
        console.log('📡 [QUEUE] Paused - waiting for connection');
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
        retryCount: 0, // ✅ Initialize retry counter
        resolve,
        reject,
      };

      queueRef.current.push(update);
      
      queryClient.setQueryData(['queue-status', matchId], { 
        processing: true, 
        queueLength: queueRef.current.length 
      });

      console.log(`➕ [QUEUE] Added update, queue: ${queueRef.current.length}, online: ${isOnlineRef.current}`);

      versionRef.current = Date.now();
      const currentVersion = versionRef.current;

      // ✅ Optimistic update (happens regardless of online status)
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
              __optimistic_version: currentVersion,
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
                __optimistic_version: currentVersion,
              },
            ];
          }
        }
      );

      // ✅ Only try to process if online
      if (isOnlineRef.current) {
        processQueue();
      } else {
        console.log('📡 [QUEUE] Offline - update queued for later');
      }
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