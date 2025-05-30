// This file will contain the actual API calls to your backend
// For now, it's just placeholder functions

import { Match } from "@/lib/types/match";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function fetchMatchHistory(username: string) {
  const res = await fetch(
    `http://localhost:8080/api/match-history/recent/${username}`
  );
  if (!res.ok) throw new Error("Không lấy được lịch sử đấu");
  const data = await res.json();
  return data.data; // lấy mảng match
}

export async function submitMatchResult(matchId: number, result: string) {
  // In a real app, this would make an API call to your backend
  // Example:
  // const response = await fetch('/api/matches/result', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ matchId, result })
  // })
  // if (!response.ok) throw new Error('Failed to submit match result')
  // return await response.json()

  // For now, just return a promise that resolves immediately
  return Promise.resolve({ success: true });
}

export async function fetchRecentMatches(username: string): Promise<Match[]> {
  const res = await fetch(
    `http://localhost:8080/api/match-history/recent/${username}`
  );
  const response: ApiResponse<Match[]> = await res.json();
  if (!response.success) throw new Error(response.message);
  return response.data;
}

export async function fetchOpponentRankMatches(
  username: string
): Promise<Match[]> {
  const res = await fetch(
    `http://localhost:8080/api/match-history/opponent-rank/${username}`
  );
  const response: ApiResponse<Match[]> = await res.json();
  if (!response.success) throw new Error(response.message);
  return response.data;
}
