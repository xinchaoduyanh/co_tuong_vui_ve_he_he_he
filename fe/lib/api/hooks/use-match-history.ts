"use client";

import { useState, useEffect } from "react";

export type MatchHistoryType = "recent" | "opponent-rank";

export interface Player {
  id: string;
  username: string;
  elo: number;
}

export interface PlayerMatch {
  id: string;
  playerId: string;
  matchId: string | null;
  opponentId: string;
  result: "WIN" | "LOSE" | "DRAW";
  eloChange: number;
  opponent: Player;
}

export function useMatchHistory(
  username: string | null,
  type: MatchHistoryType = "recent"
) {
  const [data, setData] = useState<PlayerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!username) {
      setIsLoading(false);
      setData([]);
      return;
    }

    const getMatchHistory = async () => {
      try {
        setIsLoading(true);
        const endpoint =
          type === "recent"
            ? `http://localhost:8080/api/match-history/recent/${username}`
            : `http://localhost:8080/api/match-history/opponent-rank/${username}`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("Không lấy được lịch sử đấu");
        const json = await res.json();
        setData(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    getMatchHistory();
  }, [username, type]);

  return { data, isLoading, error };
}
