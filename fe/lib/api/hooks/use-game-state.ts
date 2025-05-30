"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket-context";

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

export function useGameState() {
  const { stompClient, isConnected } = useWebSocket();
  const [players, setPlayers] = useState<any>({ red: {}, black: {} });
  const [pieces, setPieces] = useState<any[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"r" | "b">("r");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [player1Id, setPlayer1Id] = useState<string | null>(null);
  const [player2Id, setPlayer2Id] = useState<string | null>(null);
  const [player1Color, setPlayer1Color] = useState<string | null>(null);
  const [player2Color, setPlayer2Color] = useState<string | null>(null);
  const [initialBoardState, setInitialBoardState] = useState<string>("");
  const [player1, setPlayer1] = useState<any>(null);
  const [player2, setPlayer2] = useState<any>(null);

  useEffect(() => {
    setIsLoading(true);
    // Đọc dữ liệu match từ localStorage
    const matchId = localStorage.getItem("matchId");
    const player1Str = localStorage.getItem("player1");
    const player2Str = localStorage.getItem("player2");
    const currentTurn = localStorage.getItem("currentTurn");
    const initialBoardState = localStorage.getItem("initialBoardState") || "";
    let p1 = null,
      p2 = null;
    try {
      p1 = player1Str ? JSON.parse(player1Str) : null;
      p2 = player2Str ? JSON.parse(player2Str) : null;
    } catch (e) {
      p1 = null;
      p2 = null;
    }
    setMatchId(matchId);
    setPlayer1(p1);
    setPlayer2(p2);
    setPlayer1Id(p1?.id || null);
    setPlayer2Id(p2?.id || null);
    setPlayer1Color(p1?.color || null);
    setPlayer2Color(p2?.color || null);
    setInitialBoardState(initialBoardState);
    setPlayers({
      red: p1 && p1.color === "r" ? p1 : p2,
      black: p1 && p1.color === "b" ? p1 : p2,
    });
    if (initialBoardState && initialBoardState.length === 90) {
      const parsedPieces = parseBoardState(initialBoardState);
      setPieces(parsedPieces);
    } else {
      setPieces([]);
    }
    setCurrentTurn(currentTurn as any);
    setIsLoading(false);
  }, []);

  // Hàm gửi move lên BE (nếu cần)
  /**
   * Gửi nước đi lên backend qua WebSocket.
   * moveData nên bao gồm các trường:
   *   - fromX, fromY: vị trí cũ
   *   - toX, toY: vị trí mới
   *   - pieceType: loại quân
   *   - color: màu quân
   *   - moveDescription: mô tả nước đi (ví dụ: "C 1,2 -> 2,2")
   *   - boardState: chuỗi trạng thái bàn cờ mới
   *   - playerId: id người chơi
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
    currentTurn,
    isLoading,
    error,
    makeMove,
    matchId,
    player1,
    player2,
    initialBoardState,
    setPieces,
  };
}
