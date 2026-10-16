"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { API_BASE_URL } from "@/lib/api/config";

// // Mock game state - positions of pieces on the board
// const mockPieces = [
//   // Red pieces (bottom)
//   { type: "G", color: "r", x: 4, y: 9 }, // General
//   { type: "A", color: "r", x: 3, y: 9 }, // Advisor
//   { type: "A", color: "r", x: 5, y: 9 }, // Advisor
//   { type: "E", color: "r", x: 2, y: 9 }, // Elephant
//   { type: "E", color: "r", x: 6, y: 9 }, // Elephant
//   { type: "H", color: "r", x: 1, y: 9 }, // Horse
//   { type: "H", color: "r", x: 7, y: 7 }, // Horse (moved)
//   { type: "R", color: "r", x: 0, y: 9 }, // Chariot
//   { type: "R", color: "r", x: 8, y: 9 }, // Chariot
//   { type: "C", color: "r", x: 1, y: 7 }, // Cannon
//   { type: "C", color: "r", x: 7, y: 9 }, // Cannon
//   { type: "S", color: "r", x: 0, y: 6 }, // Soldier
//   { type: "S", color: "r", x: 2, y: 6 }, // Soldier
//   { type: "S", color: "r", x: 4, y: 5 }, // Soldier (moved)
//   { type: "S", color: "r", x: 6, y: 6 }, // Soldier
//   { type: "S", color: "r", x: 8, y: 6 }, // Soldier

//   // Black pieces (top)
//   { type: "G", color: "b", x: 4, y: 0 }, // General
//   { type: "A", color: "b", x: 3, y: 0 }, // Advisor
//   { type: "A", color: "b", x: 5, y: 0 }, // Advisor
//   { type: "E", color: "b", x: 2, y: 0 }, // Elephant
//   { type: "E", color: "b", x: 6, y: 0 }, // Elephant
//   { type: "H", color: "b", x: 1, y: 0 }, // Horse
//   { type: "H", color: "b", x: 7, y: 0 }, // Horse
//   { type: "R", color: "b", x: 0, y: 0 }, // Chariot
//   { type: "R", color: "b", x: 8, y: 2 }, // Chariot (moved)
//   { type: "C", color: "b", x: 1, y: 2 }, // Cannon
//   { type: "C", color: "b", x: 7, y: 2 }, // Cannon
//   { type: "S", color: "b", x: 0, y: 3 }, // Soldier
//   { type: "S", color: "b", x: 2, y: 3 }, // Soldier
//   { type: "S", color: "b", x: 4, y: 6 }, // Soldier (moved)
//   { type: "S", color: "b", x: 6, y: 3 }, // Soldier
//   { type: "S", color: "b", x: 8, y: 3 }, // Soldier
// ];

// Function to parse board state string into pieces array
export function parseBoardState(boardState: string) {
  // boardState: 90 ký tự, 9 cột x 10 hàng
  // Trả về mảng pieces: { type, color, x, y }
  const pieceMap: Record<string, { type: string; color: "r" | "b" }> = {
    r: { type: "R", color: "r" },
    h: { type: "H", color: "r" },
    e: { type: "E", color: "r" },
    a: { type: "A", color: "r" },
    k: { type: "G", color: "r" },
    c: { type: "C", color: "r" },
    p: { type: "S", color: "r" },
    R: { type: "R", color: "b" },
    H: { type: "H", color: "b" },
    E: { type: "E", color: "b" },
    A: { type: "A", color: "b" },
    K: { type: "G", color: "b" },
    C: { type: "C", color: "b" },
    P: { type: "S", color: "b" },
  };
  const pieces = [];
  for (let i = 0; i < boardState.length; i++) {
    const char = boardState[i];
    if (pieceMap[char]) {
      pieces.push({
        ...pieceMap[char],
        x: i % 9,
        y: Math.floor(i / 9),
      });
    }
  }
  return pieces;
}

export type PlayerInfo = {
  id: string;
  username: string;
  elo: number;
  wins: number;
  loses: number;
  draws: number;
  totalMatches: number;
};

// Trạng thái đầy đủ của trận từ server (GET /api/matches/{id}/snapshot)
export type GameSnapshot = {
  matchId: string;
  status: "ACTIVE" | "ENDED";
  endReason: string | null;
  winner: string | null;
  players: { red: PlayerInfo | null; black: PlayerInfo | null };
  boardState: string;
  turn: "r" | "b";
  check: boolean;
  moveDescription: string | null;
  redTimeMs: number;
  blackTimeMs: number;
  serverTime: number;
  disconnected: { red: boolean; black: boolean };
};

export function useGameState() {
  const { stompClient, isConnected } = useWebSocket();
  const [players, setPlayers] = useState<any>({ red: {}, black: {} });
  const [pieces, setPieces] = useState<any[]>([]);
  const [turn, setTurn] = useState<"r" | "b">("r");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [initialBoardState, setInitialBoardState] = useState<string>("");
  const [player1, setPlayer1] = useState<any>(null);
  const [player2, setPlayer2] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);

  // Luôn lấy trạng thái từ server, không dựa vào localStorage
  const loadSnapshot = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/${id}/snapshot`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || "Không tải được trận đấu");
      }
      const snap: GameSnapshot = body.data;
      const red = snap.players.red ? { ...snap.players.red, color: "r" } : null;
      const black = snap.players.black
        ? { ...snap.players.black, color: "b" }
        : null;
      setMatchId(snap.matchId);
      setPlayer1(red);
      setPlayer2(black);
      setPlayers({ red, black });
      setInitialBoardState(snap.boardState);
      setPieces(parseBoardState(snap.boardState));
      setTurn(snap.turn);
      setSnapshot(snap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mã trận lấy từ URL (?matchId=...), nếu không có thì dùng bản lưu từ lúc ghép trận
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("matchId") || localStorage.getItem("matchId");
    if (!id) {
      setError(new Error("Không có mã trận đấu"));
      setIsLoading(false);
      return;
    }
    loadSnapshot(id);
  }, [loadSnapshot]);

  // Sau khi kết nối lại, tải lại trạng thái để bù các nước đi bị lỡ
  useEffect(() => {
    if (isConnected && matchId) {
      loadSnapshot(matchId);
    }
  }, [isConnected, matchId, loadSnapshot]);

  /**
   * Gửi nước đi lên backend qua WebSocket.
   * Server chỉ cần fromX, fromY, toX, toY; các trường khác chỉ để hiển thị.
   */
  const makeMove = async (moveData: any, matchId: string) => {
    if (!stompClient || !isConnected) return false;
    try {
      stompClient.publish({
        destination: `/app/match.${matchId}.move`,
        body: JSON.stringify(moveData),
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return false;
    }
  };

  return {
    players,
    pieces,
    turn,
    isLoading,
    error,
    makeMove,
    matchId,
    player1,
    player2,
    initialBoardState,
    snapshot,
    setPieces,
    setTurn,
  };
}
