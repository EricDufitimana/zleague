"use client";

import { useRealtimeScoresReadOnly } from './useRealtimeScoresReadOnly';

/**
 * Pure realtime hook for basketball scores (read-only pages)
 * Convenience wrapper around useRealtimeScoresReadOnly
 */
export function useRealtimeBasketballScoresReadOnly(matchId: string) {
  return useRealtimeScoresReadOnly({
    matchId,
    sportType: 'basketball',
    enabled: !!matchId,
  });
}

