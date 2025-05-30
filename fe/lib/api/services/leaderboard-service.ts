// This file will contain the actual API calls to your backend
// For now, it's just placeholder functions

import { User } from "@/lib/types/user";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function fetchLeaderboardByTotalPoints(): Promise<User[]> {
  const res = await fetch("http://localhost:8080/api/leaderboard/total-points");
  const response: ApiResponse<User[]> = await res.json();
  console.log(response);
  if (!response.success) throw new Error(response.message);
  return response.data;
}

export async function fetchLeaderboardByWinRate(): Promise<User[]> {
  const res = await fetch("http://localhost:8080/api/leaderboard/win-rate");
  const response: ApiResponse<User[]> = await res.json();
  if (!response.success) throw new Error(response.message);
  return response.data;
}
