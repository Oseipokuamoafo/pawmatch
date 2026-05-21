"use client";

import { useQuery } from "@tanstack/react-query";

export interface Counts {
  pets: number;
  pendingMatches: number;
  unreadMessages: number;
  avgHealthScore: number;
}

/** Shared key — any consumer (nav badges, profile dropdown, dashboard
 *  widgets) that calls useCounts() hits the same cache so they update
 *  in lockstep without duplicate network traffic. */
const COUNTS_QUERY_KEY = ["counts"] as const;

interface UseCountsOptions {
  /** Polling cadence in ms. Defaults to 30s — fast enough for the badge
   *  to feel live without hammering the server. */
  refetchInterval?: number;
  /** Set false to pause the query (e.g. unauthenticated routes). */
  enabled?: boolean;
}

export function useCounts({
  refetchInterval = 30_000,
  enabled = true,
}: UseCountsOptions = {}) {
  return useQuery<Counts>({
    queryKey: COUNTS_QUERY_KEY,
    queryFn: async () => {
      const r = await fetch("/api/counts");
      if (!r.ok) throw new Error("Failed to load counts");
      return r.json();
    },
    enabled,
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}
