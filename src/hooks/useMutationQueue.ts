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

// ✅ localStorage key for persisting queue
const QUEUE_STORAGE_KEY = 'basketball-mutation-queue';

// ✅ Helper functions for localStorage persistence
function saveQueueToStorage(matchId: string, queue: QueuedUpdate[]) {
  try {
    const allQueues = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '{}');
    allQueues[matchId] = queue;
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(allQueues));
    console.log(`💾 [QUEUE] Saved ${queue.length} items to localStorage`);
  } catch (error) {
    console.error('❌ [QUEUE] Failed to save to localStorage:', error);
  }
}

function loadQueueFromStorage(matchId: string): QueuedUpdate[] {
  try {
    const allQueues = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '{}');
    const queue = allQueues[matchId] || [];
    console.log(`💾 [QUEUE] Loaded ${queue.length} items from localStorage`);
    return queue;
  } catch (error) {
    console.error('❌ [QUEUE] Failed to load from localStorage:', error);
    return [];
  }
}

function clearQueueFromStorage(matchId: string) {
  try {
    const allQueues = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '{}');
    delete allQueues[matchId];
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(allQueues));
    console.log('💾 [QUEUE] Cleared from localStorage');
  } catch (error) {
    console.error('❌ [QUEUE] Failed to clear from localStorage:', error);
  }
}

export function useMutationQueue(matchId: string) {
  const queryClient = useQueryClient();
  const queueRef = useRef<QueuedUpdate[]>([]);
  const isProcessingRef = useRef(false);
  const versionRef = useRef<number>(Date.now());
  const isOnlineRef = useRef(true);
  const hasRestoredRef = useRef(false); // ✅ Track if we've restored from storage
  
  const [queueLength, setQueueLength] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateQueueLength = useCallback(() => {
    const newLength = queueRef.current.length;
    console.log(`📊 [QUEUE] Length updated: ${newLength}`);
    setQueueLength(newLength);
    setIsProcessing(newLength > 0);
    
    // ✅ Save to localStorage whenever queue changes
    saveQueueToStorage(matchId, queueRef.current);
  }, [matchId]);

  // ✅ RESTORE queue from localStorage on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    console.log('🔄 [QUEUE] Checking localStorage for persisted queue...');
    const savedQueue = loadQueueFromStorage(matchId);
    
    if (savedQueue.length > 0) {
      console.log(`🔄 [QUEUE] Restoring ${savedQueue.length} items from localStorage`);
      queueRef.current = savedQueue;
      setQueueLength(savedQueue.length);
      setIsProcessing(true);
      
      // ✅ Restore optimistic updates to React Query cache
      savedQueue.forEach(update => {
        versionRef.current = update.timestamp;
        const currentVersion = versionRef.current;

        queryClient.setQueryData<PlayerScore[]>(
          ["basketball-scores", matchId], 
          (old = []) => {
            const existingIndex = old.findIndex(
              score => score.player_id === parseInt(update.playerId) && 
                       score.team_id === parseInt(update.teamId)
            );

            if (existingIndex >= 0) {
              const updated = [...old];
              updated[existingIndex] = {
                ...updated[existingIndex],
                points: updated[existingIndex].points + update.points,
                rebounds: updated[existingIndex].rebounds + update.rebounds,
                assists: updated[existingIndex].assists + update.assists,
                three_points_made: updated[existingIndex].three_points_made + update.threePointsMade,
                three_points_attempted: updated[existingIndex].three_points_attempted + update.threePointsAttempted,
                __optimistic_version: currentVersion,
              };
              return updated;
            } else {
              return [
                ...old,
                {
                  player_id: parseInt(update.playerId),
                  team_id: parseInt(update.teamId),
                  match_id: parseInt(matchId),
                  points: update.points,
                  rebounds: update.rebounds,
                  assists: update.assists,
                  three_points_made: update.threePointsMade,
                  three_points_attempted: update.threePointsAttempted,
                  __optimistic_version: currentVersion,
                },
              ];
            }
          }
        );
      });

      // ✅ Start processing if online
      if (navigator.onLine) {
        console.log('🔄 [QUEUE] Online - starting to process restored queue');
        setTimeout(() => processQueue(), 100);
      } else {
        console.log('🔄 [QUEUE] Offline - queue restored but waiting for connection');
      }
    }
  }, [matchId, queryClient]);

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

    queryClient.setQueryData(['queue-status', matchId], { 
      processing: true, 
      queueLength: queueRef.current.length,
      blockRealtime: true,
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
      
      // ✅ Remove from queue on success
      queueRef.current.shift();
      updateQueueLength(); // ✅ This saves to localStorage
      
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
          queueRef.current.shift();
          updateQueueLength();
        } else {
          // ✅ Update retry count in localStorage
          saveQueueToStorage(matchId, queueRef.current);
        }
      } else {
        console.error(`❌ [QUEUE] Non-network error, removing from queue`);
        queueRef.current.shift();
        updateQueueLength();
      }
    } finally {
      isProcessingRef.current = false;

      if (queueRef.current.length > 0 && isOnlineRef.current) {
        console.log(`🔄 [QUEUE] ${queueRef.current.length} items remaining, continuing...`);
        setTimeout(() => processQueue(), 150);
      } else if (queueRef.current.length === 0) {
        console.log('🎉 [QUEUE] All processed!');
        setIsProcessing(false);
        
        // ✅ Clear from localStorage when queue is empty
        clearQueueFromStorage(matchId);
        
        setTimeout(() => {
          queryClient.setQueryData(['queue-status', matchId], { 
            processing: false, 
            lastCompleted: Date.now(),
            blockRealtime: false,
          });
        }, 500);
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
        // Note: resolve/reject functions can't be serialized to localStorage
        // We'll handle this differently
      };

      queueRef.current.push(update);
      updateQueueLength(); // ✅ Saves to localStorage
      
      queryClient.setQueryData(['queue-status', matchId], { 
        processing: true, 
        queueLength: queueRef.current.length,
        blockRealtime: true,
      });

      console.log(`➕ [QUEUE] Added update, queue: ${queueRef.current.length}, online: ${isOnlineRef.current}`);

      versionRef.current = Date.now();
      const currentVersion = versionRef.current;

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

      // ✅ Always resolve immediately since we can't persist promise callbacks
      resolve({ queued: true });
    });
  }, [matchId, queryClient, processQueue, updateQueueLength]);

  return {
    queueUpdate,
    queueLength,
    isProcessing,
  };
}