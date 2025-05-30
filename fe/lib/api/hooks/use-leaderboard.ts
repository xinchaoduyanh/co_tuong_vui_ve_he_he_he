"use client";

import { useEffect, useState } from "react";
import {
  fetchLeaderboardByTotalPoints,
  fetchLeaderboardByWinRate,
} from "@/lib/api/services/leaderboard-service";
import { User } from "@/lib/types/user";

export function useLeaderboard(sortBy: "points" | "winRate" = "points") {
  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const result =
          sortBy === "points"
            ? await fetchLeaderboardByTotalPoints()
            : await fetchLeaderboardByWinRate();
        console.log("[Leaderboard API result]", result);
        const sortedPlayers = result
          ? [...result]
              .map((player) => {
                const totalGames = player.wins + player.loses + player.draws;
                const winRate =
                  totalGames > 0 ? (player.wins / totalGames) * 100 : 0;
                return {
                  ...player,
                  winRate: winRate.toFixed(1),
                };
              })
              .sort((a, b) => {
                if (sortBy === "points") {
                  return b.elo - a.elo;
                } else {
                  return (
                    Number.parseFloat(b.winRate) - Number.parseFloat(a.winRate)
                  );
                }
              })
          : [];
        console.log("[Leaderboard sortedPlayers]", sortedPlayers);
        setData(sortedPlayers);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [sortBy]);

  return { data, isLoading, error };
}
