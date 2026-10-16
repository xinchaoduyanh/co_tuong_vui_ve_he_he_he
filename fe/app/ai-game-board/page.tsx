"use client";
import { BoardSurface } from "@/components/board/board-surface";
import { PieceDisc } from "@/components/board/piece-disc";
import { PlayerBar } from "@/components/board/player-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type React from "react";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Clock,
  Trophy,
  Flag,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { parseBoardState } from "@/lib/api/hooks/use-game-state";
import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useBoardLogic } from "@/lib/api/hooks/use-board-logic";
import { useNotification } from "@/components/NotificationProvider";
import { useAIGame } from "@/lib/api/hooks/use-ai-game";

export default function AIGameBoard() {
  const { stompClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const [boardState, setBoardState] = useState<string>(
    "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR"
  );
  const [isCheck, setIsCheck] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [moveDescription, setMoveDescription] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const params = useParams();
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const { showNotification } = useNotification();

  // New state to track if welcome message has been shown
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  // State for surrender confirmation dialog
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);

  const {
    matchId,
    player1,
    player2,
    pieces,
    setPieces,
    turn,
    setTurn,
    isLoading,
    isAITurn,
    startAIGame,
  } = useAIGame();

  // Xác định màu cờ của mình
  const myColor =
    user?.id === player1?.id
      ? player1?.color
      : user?.id === player2?.id
      ? player2?.color
      : null;

  const {
    selectedPiece,
    validMoves,
    handleSelectPiece,
    handleMoveTo,
    resetSelection,
  } = useBoardLogic(pieces, turn);

  // Log để debug
  useEffect(() => {
    console.log("Current pieces state:", pieces);
    console.log("Turn:", turn);
    console.log("My color:", myColor);
  }, [pieces, turn, myColor]);

  // Add debug logging for WebSocket status
  useEffect(() => {
    console.log("[FE-Game] WebSocket Status:", {
      stompClient: !!stompClient,
      isConnected,
      matchId,
      userId: user?.id,
    });
  }, [stompClient, isConnected, matchId, user]);

  // Lắng nghe move mới từ BE
  useEffect(() => {
    if (!stompClient || !isConnected || !matchId) return;

    const handleMove = (data: any) => {
      const movingPieceColor = turn; // 'turn' state variable holds the color of the player who just moved

      setBoardState(data.boardState);
      setTurn(data.nextTurn);
      setMoveDescription(data.moveDescription);
      setIsCheck(data.isCheck);
      setIsCheckmate(data.isCheckmate);

      // Parse lại pieces từ boardState mới và cập nhật vào state
      const newPieces = parseBoardState(data.boardState);
      setPieces(newPieces);

      // Extract move details from moveDescription and log concisely
      let fenMove = "";
      try {
        const parts = data.moveDescription.split(" -> ");
        if (parts.length === 2) {
          const fromParts = parts[0].split(" "); // e.g., "C 1,2"
          const fromCoords = fromParts[1].split(","); // e.g., "1", "2"
          const toCoords = parts[1].split(","); // e.g., "2", "2"

          const fromX = parseInt(fromCoords[0]);
          const fromY = parseInt(fromCoords[1]);
          const toX = parseInt(toCoords[0]);
          const toY = parseInt(toCoords[1]);

          const fenFromY = 9 - fromY;
          const fenToY = 9 - toY;

          const fenFromXChar = String.fromCharCode("a".charCodeAt(0) + fromX);
          const fenToXChar = String.fromCharCode("a".charCodeAt(0) + toX);

          fenMove = `${fenFromXChar}${fenFromY}${fenToXChar}${fenToY}`;
        }
      } catch (e) {
        console.error("[FE-Game] Error parsing moveDescription for log:", e);
      }

      console.log(`[FE-Game] Move: ${fenMove} by ${movingPieceColor}`);

      if (data.isCheckmate) {
        showNotification({
          severity: "info",
          summary: "Kết thúc trận đấu",
          detail: "Chiếu bí! Trận đấu kết thúc.",
        });
      } else if (data.isCheck) {
        showNotification({
          severity: "warn",
          summary: "Chiếu tướng",
          detail: "Tướng của bạn đang bị chiếu!",
        });
      }
      // Lưu lại trạng thái mới vào localStorage
      if (data.boardState) {
        localStorage.setItem("initialBoardState", data.boardState);
      }
      if (data.nextTurn) {
        localStorage.setItem("currentTurn", data.nextTurn);
      }
    };

    const subscription = stompClient.subscribe(
      `/topic/match.${matchId}.board`,
      (message) => {
        const data = JSON.parse(message.body);
        handleMove(data);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [stompClient, isConnected, matchId, setPieces]);

  useEffect(() => {
    if (!stompClient || !isConnected || !matchId) return;
    const sub = stompClient.subscribe(`/topic/match.${matchId}.end`, (msg) => {
      const data = JSON.parse(msg.body);
      if (data.type === "END_GAME") {
        // Cập nhật user nếu là player1 hoặc player2
        const myId = user?.id;
        let updatedUser = null;
        if (data.player1 && data.player1.id === myId)
          updatedUser = data.player1;
        if (data.player2 && data.player2.id === myId)
          updatedUser = data.player2;
        if (updatedUser) {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        // Hiển thị thông báo kết quả
        const isWinner =
          (data.player1 && data.player1.id === myId && data.winner === "red") ||
          (data.player2 && data.player2.id === myId && data.winner === "black");
        const myEloChange =
          data.player1 && data.player1.id === myId
            ? data.player1EloChange
            : data.player2EloChange;
        const opponentEloChange =
          data.player1 && data.player1.id === myId
            ? data.player2EloChange
            : data.player1EloChange;

        showNotification({
          severity: isWinner ? "success" : "info",
          summary: "Kết thúc trận đấu",
          detail: `${
            isWinner ? "Bạn thắng" : "Bạn thua"
          }\nĐiểm thay đổi của bạn: ${
            myEloChange > 0 ? "+" : ""
          }${myEloChange}\nĐiểm thay đổi của đối thủ: ${
            opponentEloChange > 0 ? "+" : ""
          }${opponentEloChange}`,
          life: 5000,
        });

        // Điều hướng về Home hoặc trang kết quả
        router.push("/");
      }
    });
    return () => sub.unsubscribe();
  }, [stompClient, isConnected, matchId, user, router, showNotification]);

  // Hiển thị thông báo chào mừng khi vào game
  useEffect(() => {
    if (
      !isLoading &&
      player1 &&
      player2 &&
      myColor &&
      user &&
      turn &&
      !hasShownWelcome
    ) {
      const opponent = user.id === player1.id ? player2 : player1;
      const isMyTurn =
        (myColor === "r" && turn === "r") || (myColor === "b" && turn === "b");

      showNotification({
        severity: "info",
        summary: "Chào mừng!",
        detail: `Xin chào đến với game đấu với AI, bạn xuất phát với quân ${
          myColor === "r" ? "đỏ" : "đen"
        } xin hãy ${isMyTurn ? "đi trước" : "chờ AI"}`,
        life: 5000,
      });
      setHasShownWelcome(true); // Mark as shown
    }
  }, [
    isLoading,
    player1,
    player2,
    myColor,
    user,
    turn,
    hasShownWelcome,
    showNotification,
  ]);

  // Helper: Serialize pieces array to boardState string (90 ký tự)
  function serializePiecesToBoardState(
    pieces: { type: string; color: "r" | "b"; x: number; y: number }[]
  ): string {
    // Bản đồ ký tự cho từng loại quân
    const charMap: Record<string, string> = {
      r: "r",
      b: "R",
      h: "h",
      H: "H",
      e: "e",
      E: "E",
      a: "a",
      A: "A",
      k: "k",
      K: "K",
      c: "c",
      C: "C",
      p: "p",
      P: "P",
      // Map type+color to char
      Rr: "r",
      Rb: "R",
      Hr: "h",
      Hb: "H",
      Er: "e",
      Eb: "E",
      Ar: "a",
      Ab: "A",
      Gr: "k",
      Gb: "K", // G = General/King
      Cr: "c",
      Cb: "C",
      Sr: "p",
      Sb: "P",
    };
    let arr = Array(90).fill(".");
    for (const p of pieces) {
      const idx = p.y * 9 + p.x;
      const key = p.type + p.color;
      arr[idx] = charMap[key] || ".";
    }
    return arr.join("");
  }

  // Khi người chơi thực hiện nước đi (click vào ô xanh)
  const handlePlayerMove = (toX: number, toY: number) => {
    if (!selectedPiece) return;
    if (!validMoves.some((m) => m.x === toX && m.y === toY)) return;
    // 1. Cập nhật local state (di chuyển quân cờ)
    const newPieces = pieces
      .filter(
        (p) => !(p.x === toX && p.y === toY && p.color !== selectedPiece.color)
      )
      .map((p) => (p === selectedPiece ? { ...p, x: toX, y: toY } : p));
    // 2. Serialize lại thành boardState string
    const newBoardState = serializePiecesToBoardState(newPieces);
    // 3. Gửi move lên BE với đầy đủ thông tin
    if (matchId && stompClient && myColor === turn) {
      stompClient.publish({
        destination: `/app/match.${matchId}.move`,
        body: JSON.stringify({
          fromX: selectedPiece.x,
          fromY: selectedPiece.y,
          toX,
          toY,
          pieceType: selectedPiece.type,
          color: selectedPiece.color,
          moveDescription: `${selectedPiece.type} ${selectedPiece.x},${selectedPiece.y} -> ${toX},${toY}`,
          boardState: newBoardState,
          playerId: user?.id,
        }),
      });
    }
    // 4. Reset selection (UI sẽ cập nhật khi nhận được move mới từ BE)
    resetSelection();
  };

  // Thêm hàm chuyển đổi toạ độ click sang toạ độ bàn cờ
  function getBoardCoordsFromSVGEvent(
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) {
    if (!svgRef.current) return null;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    // Tính toán vị trí tương đối trong SVG
    const x = ((e.clientX - rect.left) / rect.width) * 10 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 11 - 1;

    // Làm tròn về toạ độ bàn cờ
    const boardX = Math.round(x);
    const boardY = Math.round(y);

    if (boardX < 0 || boardX > 8 || boardY < 0 || boardY > 9) return null;
    return { x: boardX, y: boardY };
  }

  const handleSurrender = () => {
    setShowSurrenderDialog(true);
  };

  const handleConfirmSurrender = () => {
    if (stompClient && isConnected && matchId && user?.id) {
      const surrenderRequest = {
        matchId: matchId,
        playerId: user.id,
      };
      stompClient.publish({
        destination: "/app/game.surrender",
        body: JSON.stringify(surrenderRequest),
      });
      showNotification({
        severity: "info",
        summary: "Yêu cầu đầu hàng đã được gửi",
        detail: "Hãy chờ hệ thống xử lý",
        life: 3000,
      });
    }
    setShowSurrenderDialog(false);
  };

  const handleCancelSurrender = () => {
    setShowSurrenderDialog(false);
  };

  // Start AI game when component mounts
  useEffect(() => {
    if (stompClient && isConnected && user && !matchId) {
      startAIGame();
    }
  }, [stompClient, isConnected, user, matchId, startAIGame]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-dvh bg-background">
        <div className="text-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-3 pb-10 pt-3">
      <div className="w-full">
        <header className="mb-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Về trang chủ">
            <Link href="/">
              <ChevronLeft />
            </Link>
          </Button>
          <h1 className="font-display text-xl font-bold">Cờ Tướng với máy</h1>
          <Button variant="ghost" size="sm" className="ml-auto text-primary hover:text-primary" onClick={handleSurrender}>
            <Flag />
            Đầu hàng
          </Button>
        </header>

        <div className="mb-3">
          <PlayerBar
            name={player1?.username}
            elo={player1?.elo}
            isMe={user?.id === player1?.id}
            side="r"
            active={turn === "r"}
          />
        </div>

        {/* Game board container with padding */}
        <div className="relative mx-auto w-full overflow-hidden rounded-xl shadow-[0_28px_60px_-28px_hsl(150_14%_2%/0.9)]">
          {/* SVG container with padding to ensure pieces aren't cut off */}
          <div className="relative w-full" style={{ aspectRatio: "10 / 11" }}>
            <svg
              ref={svgRef}
              viewBox="-1 -1 10 11"
              className="absolute inset-0 w-full h-full"
              onClick={(e) => {
                if (!selectedPiece || turn !== myColor) return;

                const coords = getBoardCoordsFromSVGEvent(e);
                if (!coords) return;

                const hasPiece = pieces.some(
                  (p) => p.x === coords.x && p.y === coords.y
                );

                if (
                  !hasPiece &&
                  validMoves.some((m) => m.x === coords.x && m.y === coords.y)
                ) {
                  handleMoveTo(coords.x, coords.y);
                }
              }}
            >
              <BoardSurface />

              {/* Valid moves indicators */}
              {turn === myColor &&
                validMoves
                  .filter((move) => move.x <= 8)
                  .map((move, moveIndex) => (
                    <circle
                      key={moveIndex}
                      cx={move.x}
                      cy={move.y}
                      r="0.3"
                      fill="#3FA37F"
                      fillOpacity="0.5"
                      stroke="#3FA37F"
                      strokeWidth="0.03"
                      onClick={() => handlePlayerMove(move.x, move.y)}
                    />
                  ))}

              {/* Chess Pieces */}
              {pieces &&
                pieces.length > 0 &&
                pieces
                  .filter(
                    (piece) =>
                      typeof piece.x === "number" &&
                      typeof piece.y === "number" &&
                      piece.x <= 8
                  )
                  .map((piece) => {
                    const isSelected =
                      selectedPiece &&
                      selectedPiece.x === piece.x &&
                      selectedPiece.y === piece.y;

                    // Quân này có thể bị ăn bởi quân đang chọn?
                    const canBeCaptured =
                      selectedPiece &&
                      piece.color !== selectedPiece.color &&
                      validMoves.some(
                        (m) => m.x === piece.x && m.y === piece.y
                      );

                    return (
                      <g
                        key={`piece-${piece.type}-${piece.color}-${piece.x}-${piece.y}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (turn === myColor && piece.color === myColor) {
                            handleSelectPiece(piece);
                          } else if (
                            selectedPiece &&
                            turn === myColor &&
                            piece.color !== myColor &&
                            validMoves.some(
                              (m) => m.x === piece.x && m.y === piece.y
                            )
                          ) {
                            // Capture opponent's piece
                            handlePlayerMove(piece.x, piece.y);
                          }
                        }}
                        style={{
                          cursor:
                            (piece.color === myColor && turn === myColor) ||
                            (selectedPiece &&
                              turn === myColor &&
                              piece.color !== myColor &&
                              validMoves.some(
                                (m) => m.x === piece.x && m.y === piece.y
                              ))
                              ? "pointer"
                              : "default",
                        }}
                      >
                        <PieceDisc x={piece.x} y={piece.y} color={piece.color} type={piece.type} />
                        {/* Selected piece indicator */}
                        {isSelected && (
                          <circle
                            cx={piece.x}
                            cy={piece.y}
                            r="0.45"
                            fill="none"
                            stroke="#4CAF50"
                            strokeWidth="0.05"
                            pointerEvents="none"
                          />
                        )}
                        {/* Hiệu ứng quân bị ăn */}
                        {canBeCaptured && (
                          <circle
                            cx={piece.x}
                            cy={piece.y}
                            r="0.5"
                            fill="none"
                            stroke="#F44336"
                            strokeWidth="0.07"
                            strokeDasharray="0.1,0.1"
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  })}
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 w-full">
        <PlayerBar
          name={player2?.username}
          elo={player2?.elo}
          isMe={user?.id === player2?.id}
          side="b"
          active={turn === "b"}
        />
      </div>

      <ConfirmDialog
        open={showSurrenderDialog}
        title="Đầu hàng"
        description="Bạn có chắc chắn muốn đầu hàng? Ván này sẽ tính là thua."
        confirmLabel="Đầu hàng"
        cancelLabel="Hủy"
        onConfirm={handleConfirmSurrender}
        onCancel={handleCancelSurrender}
      />
    </div>
  );
}
