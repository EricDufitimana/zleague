"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { ReactNode, useState } from "react";
import { updateBasketballScore } from "@/actions/livescore/basketball-update";

// ✅ Create async persister (no deprecation warning)
const persister = createAsyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'BASKETBALL_SCORES_CACHE',
  throttleTime: 1000,
});

// ✅ API function wrapper for the server action
async function updateBasketballScoreWrapper(params: {
  matchId: string;
  teamId: string;
  playerId: string;
  points: number;
  rebounds: number;
  assists: number;
  threePointsMade: number;
  threePointsAttempted: number;
}) {
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

  return result.data;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 1000 * 60 * 60 * 24, // 24 hours (cache time)
          staleTime: 5000, // 5 seconds
          refetchOnWindowFocus: false,
          networkMode: 'offlineFirst', // ✅ CRITICAL FOR OFFLINE
        },
        mutations: {
          networkMode: 'offlineFirst', // ✅ CRITICAL FOR OFFLINE
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        },
      },
    });

    // ✅ Set default mutation function (REQUIRED for persistence)
    client.setMutationDefaults(['update-basketball-score'], {
      mutationFn: updateBasketballScoreWrapper,
      retry: (failureCount, error) => {
        if (error.message.includes('Server has closed')) {
          return failureCount < 2;
        }
        return false;
      },
    });

    return client;
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ 
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      }}
      onSuccess={() => {
        // ✅ Resume paused mutations after hydration
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}