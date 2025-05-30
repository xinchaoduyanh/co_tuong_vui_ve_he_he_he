export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  aiModelId?: string | null;
  startDate: string; // ISO string
  endDate: string | null;
  result: string; // "player1" | "player2" | "DRAW" | ...
  isTournamentMatch: boolean;

  // Các trường FE cần cho UI lịch sử đấu:
  opponent?: string;
  opponentRating?: number;
  date?: string;
  pointsChange?: number;
  resultText?: "win" | "loss" | "draw";
}
