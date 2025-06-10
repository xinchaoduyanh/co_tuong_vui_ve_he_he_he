import { useEffect, useState } from "react";
import { fetchOnlinePlayers } from "@/lib/api/services/online-player-service";

export type OnlinePlayer = {
  id: string;
  username: string;
  sessionId: string;
  status: string;
  elo?: number;
  wins?: number;
  loses?: number;
  draws?: number;
  totalMatches?: number;
};

export function useOnlinePlayers() {
  const [data, setData] = useState<OnlinePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchOnlinePlayers()
      .then((players) => {
        setData(players);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setData([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}
