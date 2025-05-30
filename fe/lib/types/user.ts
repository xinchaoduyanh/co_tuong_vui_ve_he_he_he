// fe/lib/types/user.ts
export interface User {
  id: string;
  username: string;
  elo: number;
  totalMatches: number;
  wins: number;
  loses: number;
  draws: number;
}
