"use client";

import { useRealtimeScoresReadOnly } from './useRealtimeScoresReadOnly';

/**
 * Pure realtime hook for football scores (read-only pages)
 * Convenience wrapper around useRealtimeScoresReadOnly
 */
export function useRealtimeFootballScoresReadOnly(matchId: string) {
  return useRealtimeScoresReadOnly({
    matchId,
    sportType: 'football',
    enabled: !!matchId,
  });
}

