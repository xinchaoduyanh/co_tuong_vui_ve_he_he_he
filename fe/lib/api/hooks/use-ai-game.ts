import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useRouter } from "next/navigation";
import { parseBoardState } from "./use-game-state";

export interface Player {
  id: string;
  username: string;
  color: "r" | "b";
  elo: number;
}

export interface Piece {
  type: string;
  color: "r" | "b";
  x: number;
  y: number;
}

export const useAIGame = () => {
  const { stompClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const router = useRouter();

  const [matchId, setMatchId] = useState<string | null>(null);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [initialBoardState, setInitialBoardState] = useState<string>(
    "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR"
  );
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<"r" | "b">("r");
  const [isLoading, setIsLoading] = useState(true);
  const [isAITurn, setIsAITurn] = useState(false);
  const [aiDifficulty, setAIDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );

  useEffect(() => {
    if (!stompClient || !isConnected || !user) return;

    // Subscribe to AI game response
    const subscription = stompClient.subscribe(
      `/user/${user.username}/queue/game.withAI`,
      (message) => {
        const data = JSON.parse(message.body);
        if (data.type === "GAME_STARTED") {
          setMatchId(data.matchId);
          setPlayer1(data.player1);
          setPlayer2(data.player2);
          setInitialBoardState(data.initialBoardState);
          setTurn(data.currentTurn);
          setPieces(parseBoardState(data.initialBoardState));
          setIsLoading(false);

          // Navigate to AI game board (stay on this page, as it's already the AI game board)
          // router.push(`/game-board?matchId=${data.matchId}`); // Removed navigation
          // Instead, just update the matchId state here
          // No explicit push needed as we are already on the AI game board
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [stompClient, isConnected, user, router]);

  const startAIGame = () => {
    console.log("[FE-Debug] Inside startAIGame function.");
    if (!stompClient || !isConnected || !user) {
      console.log(
        "[FE-Debug] startAIGame: Conditions not met. stompClient: ",
        !!stompClient,
        ", isConnected: ",
        isConnected,
        ", user: ",
        !!user
      );
      return;
    }

    console.log(
      "[FE-Debug] Attempting to publish to /app/game.withAI with username: ",
      user.username
    );
    stompClient.publish({
      destination: "/app/game.withAI",
      body: user.username,
    });
    console.log("[FE-Debug] Published message to /app/game.withAI");
  };

  return {
    matchId,
    player1,
    player2,
    initialBoardState,
    pieces,
    setPieces,
    turn,
    setTurn,
    isLoading,
    isAITurn,
    aiDifficulty,
    setAIDifficulty,
    startAIGame,
  };
};
