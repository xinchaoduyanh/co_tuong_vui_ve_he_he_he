import { useState, useEffect } from "react";
import { useGameState } from "./use-game-state";
import { getAIMove, AIMove } from "../services/ai-service";
import { useWebSocket } from "@/lib/websocket-context";

export function useAIGame() {
  const {
    players,
    pieces,
    turn,
    isLoading,
    makeMove,
    matchId,
    player1,
    player2,
    initialBoardState,
    setPieces,
    setTurn,
  } = useGameState();

  const [isAITurn, setIsAITurn] = useState(false);
  const [aiDifficulty, setAIDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const { stompClient } = useWebSocket();

  // Function to handle AI's move
  const handleAIMove = async () => {
    if (!isAITurn || !matchId) return;

    try {
      // Get current board state
      const boardState = pieces.reduce((acc: string[], piece) => {
        const idx = piece.y * 9 + piece.x;
        acc[idx] =
          piece.color === "r"
            ? piece.type.toLowerCase()
            : piece.type.toUpperCase();
        return acc;
      }, Array(90).fill("."));

      // Get AI's move
      const aiMove = await getAIMove(boardState.join(""), aiDifficulty);

      // Make the move
      if (stompClient?.connected) {
        makeMove(
          {
            fromX: aiMove.fromX,
            fromY: aiMove.fromY,
            toX: aiMove.toX,
            toY: aiMove.toY,
            pieceType: aiMove.pieceType,
            color: aiMove.color,
            moveDescription: `${aiMove.pieceType} ${aiMove.fromX},${aiMove.fromY} -> ${aiMove.toX},${aiMove.toY}`,
            boardState: boardState.join(""),
            playerId: player2?.id,
          },
          matchId
        );
      }
    } catch (error) {
      console.error("Error making AI move:", error);
    }
  };

  // Watch for turn changes to trigger AI moves
  useEffect(() => {
    if (turn === "b" && player2?.isAI) {
      setIsAITurn(true);
      handleAIMove();
    } else {
      setIsAITurn(false);
    }
  }, [turn, player2?.isAI]);

  return {
    players,
    pieces,
    turn,
    isLoading,
    makeMove,
    matchId,
    player1,
    player2,
    initialBoardState,
    setPieces,
    setTurn,
    isAITurn,
    aiDifficulty,
    setAIDifficulty,
  };
}
