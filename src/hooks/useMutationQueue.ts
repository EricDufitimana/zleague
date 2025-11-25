"use client";

import { useRef, useCallback, useEffect, useState } from 'react';
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
  retryCount: number;
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
  
  // ✅ REACTIVE state for queue length (triggers re-renders)
  const [queueLength, setQueueLength] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Update queue length state whenever queue changes
  const updateQueueLength = useCallback(() => {
    const newLength = queueRef.current.length;
    console.log(`📊 [QUEUE] Length updated: ${newLength}`);
    setQueueLength(newLength);
    setIsProcessing(newLength > 0);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [QUEUE] Back online - resuming queue processing');
      isOnlineRef.current = true;
      
      if (queueRef.current.length > 0) {
        console.log(`🌐 [QUEUE] Processing ${queueRef.current.length} queued items`);
        processQueue();
      }
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

    if (!isOnlineRef.current) {
      console.log('📡 [QUEUE] Offline - pausing until connection restored');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    const update = queueRef.current[0];

    console.log(`🔵 [QUEUE] Processing item for player ${update.playerId} (${queueRef.current.length} in queue)`);

    // ✅ Mark queue as actively processing
    queryClient.setQueryData(['queue-status', matchId], { 
      processing: true, 
      queueLength: queueRef.current.length,
      blockRealtime: true, // ✅ Block realtime invalidation
    });

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
      
      // ✅ Remove from queue on success
      queueRef.current.shift();
      updateQueueLength(); // ✅ Trigger UI update
      
    } catch (error: any) {
      console.error(`❌ [QUEUE] Error:`, error?.message);

      const isNetworkError = 
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('Server has closed') ||
        !navigator.onLine;

      if (isNetworkError) {
        console.log(`🔄 [QUEUE] Network error - will retry (attempt ${update.retryCount + 1})`);
        update.retryCount++;
        
        if (update.retryCount > 10) {
          console.error(`❌ [QUEUE] Max retries exceeded`);
          update.reject(new Error('Max retries exceeded'));
          queueRef.current.shift();
          updateQueueLength();
        }
      } else {
        console.error(`❌ [QUEUE] Non-network error, removing from queue`);
        update.reject(error);
        queueRef.current.shift();
        updateQueueLength();
      }
    } finally {
      isProcessingRef.current = false;

      if (queueRef.current.length > 0 && isOnlineRef.current) {
        console.log(`🔄 [QUEUE] ${queueRef.current.length} items remaining, continuing...`);
        setTimeout(() => processQueue(), 150); // ✅ Small delay between updates
      } else if (queueRef.current.length === 0) {
        console.log('🎉 [QUEUE] All processed! Safe to invalidate now.');
        setIsProcessing(false);
        
        // ✅ Allow realtime to invalidate AFTER a delay
        setTimeout(() => {
          queryClient.setQueryData(['queue-status', matchId], { 
            processing: false, 
            lastCompleted: Date.now(),
            blockRealtime: false, // ✅ Unblock realtime
          });
        }, 500); // Wait 500ms before allowing realtime refresh
      } else {
        console.log('📡 [QUEUE] Paused - waiting for connection');
        setIsProcessing(false);
      }
    }
  }, [matchId, queryClient, updateQueueLength]);

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
        retryCount: 0,
        resolve,
        reject,
      };

      queueRef.current.push(update);
      updateQueueLength(); // ✅ Trigger UI update immediately
      
      // ✅ Block realtime while queue is active
      queryClient.setQueryData(['queue-status', matchId], { 
        processing: true, 
        queueLength: queueRef.current.length,
        blockRealtime: true,
      });

      console.log(`➕ [QUEUE] Added update, queue: ${queueRef.current.length}, online: ${isOnlineRef.current}`);

      versionRef.current = Date.now();
      const currentVersion = versionRef.current;

      // ✅ Optimistic update
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

      if (isOnlineRef.current) {
        processQueue();
      } else {
        console.log('📡 [QUEUE] Offline - update queued for later');
      }
    });
  }, [matchId, queryClient, processQueue, updateQueueLength]);

  return {
    queueUpdate,
    queueLength, // ✅ Return reactive state
    isProcessing, // ✅ Return reactive state
  };
}