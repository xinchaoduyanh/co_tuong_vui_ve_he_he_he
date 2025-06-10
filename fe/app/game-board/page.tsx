"use client";
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
import { parseBoardState, useGameState } from "@/lib/api/hooks/use-game-state";
import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useBoardLogic } from "@/lib/api/hooks/use-board-logic";
import { useNotification } from "@/components/NotificationProvider";

const redSymbols = {
  G: "帥",
  A: "仕",
  E: "相",
  H: "傌",
  R: "俥",
  C: "炮",
  S: "兵",
};
const blackSymbols = {
  G: "將",
  A: "士",
  E: "象",
  H: "馬",
  R: "車",
  C: "砲",
  S: "卒",
};

export default function GameBoard() {
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
  const { stompClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const [boardState, setBoardState] = useState<string>(initialBoardState);
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
  // Add new states for draw request
  const [showDrawRequestDialog, setShowDrawRequestDialog] = useState(false);
  const [showDrawResponseDialog, setShowDrawResponseDialog] = useState(false);
  const [drawRequestFrom, setDrawRequestFrom] = useState<string | null>(null);

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
      console.log("Received move data:", data);
      setBoardState(data.boardState);
      setTurn(data.nextTurn);
      setMoveDescription(data.moveDescription);
      setIsCheck(data.isCheck);
      setIsCheckmate(data.isCheckmate);

      // Parse lại pieces từ boardState mới và cập nhật vào state
      const newPieces = parseBoardState(data.boardState);
      setPieces(newPieces);

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
        (myColor === "red" && turn === "r") ||
        (myColor === "black" && turn === "b");

      showNotification({
        severity: "info",
        summary: "Chào mừng!",
        detail: `Xin chào đến với game đấu, đối thủ của bạn là ${
          opponent.username
        }, bạn xuất phát với quân ${myColor === "red" ? "đỏ" : "đen"} xin hãy ${
          isMyTurn ? "đi trước" : "chờ đối thủ"
        }`,
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
      makeMove(
        {
          fromX: selectedPiece.x,
          fromY: selectedPiece.y,
          toX,
          toY,
          pieceType: selectedPiece.type,
          color: selectedPiece.color,
          moveDescription: `${selectedPiece.type} ${selectedPiece.x},${selectedPiece.y} -> ${toX},${toY}`,
          boardState: newBoardState,
          playerId: user?.id,
        },
        matchId
      );
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

  // Add draw request handlers
  const handleDrawRequest = () => {
    console.log("[FE-Game] ====== Draw Request Button Clicked ======");
    console.log("[FE-Game] Current state:", {
      stompClient: !!stompClient,
      isConnected,
      matchId,
      userId: user?.id,
      player1Id: player1?.id,
      player2Id: player2?.id,
    });

    if (!stompClient || !isConnected) {
      console.log("[FE-Game] WebSocket not connected");
      showNotification({
        severity: "error",
        summary: "Lỗi kết nối",
        detail: "Không thể kết nối đến máy chủ",
        life: 3000,
      });
      return;
    }
    setShowDrawRequestDialog(true);
  };

  const handleConfirmDrawRequest = () => {
    console.log("[FE-Game] ====== Confirming Draw Request ======");
    console.log("[FE-Game] Current state:", {
      stompClient: !!stompClient,
      isConnected,
      matchId,
      userId: user?.id,
    });

    if (stompClient && isConnected && matchId && user?.id) {
      const drawRequest = {
        matchId: matchId,
        playerId: user.id,
      };
      console.log("[FE-Game] Sending draw offer:", drawRequest);
      try {
        stompClient.publish({
          destination: "/app/game.drawOffer",
          body: JSON.stringify(drawRequest),
        });
        showNotification({
          severity: "info",
          summary: "Yêu cầu cầu hòa",
          detail: "Đã gửi yêu cầu cầu hòa đến đối thủ.",
          life: 3000,
        });
      } catch (error) {
        console.error("[FE-Game] Error sending draw offer:", error);
        showNotification({
          severity: "error",
          summary: "Lỗi",
          detail: "Không thể gửi yêu cầu cầu hòa",
          life: 3000,
        });
      }
    } else {
      console.log("[FE-Game] Cannot send draw offer:", {
        stompClient: !!stompClient,
        isConnected,
        matchId,
        userId: user?.id,
      });
    }
    setShowDrawRequestDialog(false);
  };

  const handleCancelDrawRequest = () => {
    setShowDrawRequestDialog(false);
  };

  // Add WebSocket subscription for draw requests
  useEffect(() => {
    console.log("[FE-Game] ====== Setting up WebSocket subscriptions ======");
    console.log("[FE-Game] Current WebSocket state:", {
      stompClient: !!stompClient,
      isConnected,
      matchId,
      userId: user?.id,
      player1Id: player1?.id,
      player2Id: player2?.id,
    });

    if (!stompClient || !isConnected || !matchId) {
      console.log(
        "[FE-Game] Cannot setup draw subscriptions - Missing required data:",
        {
          stompClient: !!stompClient,
          isConnected,
          matchId,
        }
      );
      return;
    }

    console.log("[FE-Game] Setting up draw subscriptions for match:", matchId);
    console.log(
      "[FE-Game] Subscribing to topic:",
      `/topic/match.${matchId}.drawOffer`
    );

    try {
      // Subscribe to draw offer requests
      const drawRequestSub = stompClient.subscribe(
        `/topic/match.${matchId}.drawOffer`, // Changed from /queue to /topic
        (msg) => {
          console.log("[FE-Game] ====== Draw Offer Message Received ======");
          console.log("[FE-Game] Message headers:", msg.headers);
          console.log("[FE-Game] Message body:", msg.body);
          console.log("[FE-Game] Current user:", user?.id);
          console.log("[FE-Game] Current matchId:", matchId);
          console.log("[FE-Game] ======================================");

          const data = JSON.parse(msg.body);
          console.log("[FE-Game] Parsed draw offer data:", data);

          if (data.type === "DRAW_OFFER" && data.from !== user?.id) {
            console.log("[FE-Game] Processing draw offer from:", data.from);
            setDrawRequestFrom(data.from);
            setShowDrawResponseDialog(true);
            showNotification({
              severity: "info",
              summary: "Yêu cầu cầu hòa",
              detail: "Đối thủ muốn cầu hòa với bạn",
              life: 5000,
            });
          } else {
            console.log("[FE-Game] Ignoring draw offer:", {
              type: data.type,
              from: data.from,
              userId: user?.id,
              isFromSelf: data.from === user?.id,
            });
          }
        }
      );

      console.log("[FE-Game] Draw offer subscription setup complete");

      // Subscribe to draw responses
      const drawResponseSub = stompClient.subscribe(
        `/topic/match.${matchId}.drawResponse`, // Changed from /queue to /topic
        (msg) => {
          console.log("[FE-Game] Received draw response:", msg.body);
          const data = JSON.parse(msg.body);
          if (data.type === "DRAW_REJECTED" && data.from !== user?.id) {
            showNotification({
              severity: "info",
              summary: "Cầu hòa bị từ chối",
              detail: "Đối thủ đã từ chối yêu cầu cầu hòa của bạn.",
              life: 3000,
            });
          }
        }
      );

      console.log("[FE-Game] Draw response subscription setup complete");
      console.log(
        "[FE-Game] ====== WebSocket subscriptions setup complete ======"
      );

      return () => {
        console.log("[FE-Game] Cleaning up draw subscriptions");
        drawRequestSub.unsubscribe();
        drawResponseSub.unsubscribe();
      };
    } catch (error) {
      console.error("[FE-Game] Error setting up draw subscriptions:", error);
    }
  }, [
    stompClient,
    isConnected,
    matchId,
    user,
    showNotification,
    player1,
    player2,
  ]);

  const handleDrawResponse = (accepted: boolean) => {
    if (stompClient && isConnected && matchId && user?.id) {
      const drawResponse = {
        matchId: matchId,
        playerId: user.id,
        accepted: accepted,
      };
      console.log("Sending draw response:", drawResponse);
      stompClient.publish({
        destination: "/app/game.drawResponse",
        body: JSON.stringify(drawResponse),
      });
      showNotification({
        severity: accepted ? "success" : "info",
        summary: "Phản hồi cầu hòa",
        detail: accepted
          ? "Bạn đã chấp nhận cầu hòa"
          : "Bạn đã từ chối cầu hòa",
        life: 3000,
      });
    }
    setShowDrawResponseDialog(false);
    setDrawRequestFrom(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <div className="text-amber-800">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/80 hover:bg-white shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-800 bg-white/80 px-4 py-1 rounded-lg shadow-sm">
            Cờ Tướng
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-red-500 bg-white/80 hover:bg-white shadow-sm"
            onClick={handleSurrender}
          >
            <Flag className="h-4 w-4 mr-1" />
            Đầu hàng
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-500 border-blue-500 bg-white/80 hover:bg-white shadow-sm ml-2"
            onClick={handleDrawRequest}
            disabled={!isConnected || !stompClient}
          >
            Cầu hòa
          </Button>
        </div>

        {/* Player info (top) */}
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-4 mb-4 flex items-center">
          {/* Player1 (Red player) details */}
          <Avatar className="h-10 w-10 border-2 border-red-400 shadow-sm">
            <AvatarImage src="/placeholder.svg" alt={player1?.username} />
            <AvatarFallback>
              {player1?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center">
            <p className="font-medium">
              {player1?.username} {user?.id === player1?.id && "(Bạn)"}
            </p>
            <span>ELO: {player1?.elo}</span>
          </div>
          <span className="ml-auto text-sm font-mono">
            <Clock className="inline-block w-4 h-4 mr-1" />
            {players.red.timeLeft}
          </span>
        </div>

        {/* Game board container with padding */}
        <div className="relative w-full rounded-lg shadow-lg mb-2 mx-auto overflow-hidden border-8 border-amber-700">
          {/* SVG container with padding to ensure pieces aren't cut off */}
          <div className="relative w-full pb-[112.5%]">
            <svg
              ref={svgRef}
              viewBox="-1 -1 10 11"
              className="absolute inset-0 w-full h-full"
              style={{ background: "#f0d9b5" }}
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
              {/* Border */}
              <rect x="-1" y="-1" width="10" height="11" fill="#B45309" />

              {/* Background */}
              <rect x="0" y="0" width="8" height="9" fill="#F7D794" />

              {/* Horizontal lines */}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i}
                  x2="8"
                  y2={i}
                  stroke="#8B4513"
                  strokeWidth="0.05"
                />
              ))}

              {/* Vertical lines */}
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i}
                  y1="0"
                  x2={i}
                  y2="9"
                  stroke="#8B4513"
                  strokeWidth="0.05"
                />
              ))}

              {/* River */}
              <rect
                x="0"
                y="4"
                width="8"
                height="1"
                fill="#D6EAF8"
                fillOpacity="0.5"
              />

              {/* Palace diagonal lines (top) */}
              <line
                x1="3"
                y1="0"
                x2="5"
                y2="2"
                stroke="#8B4513"
                strokeWidth="0.05"
              />
              <line
                x1="5"
                y1="0"
                x2="3"
                y2="2"
                stroke="#8B4513"
                strokeWidth="0.05"
              />

              {/* Palace diagonal lines (bottom) */}
              <line
                x1="3"
                y1="7"
                x2="5"
                y2="9"
                stroke="#8B4513"
                strokeWidth="0.05"
              />
              <line
                x1="5"
                y1="7"
                x2="3"
                y2="9"
                stroke="#8B4513"
                strokeWidth="0.05"
              />

              {/* River text - Replaced with Turn indicator */}
              {myColor && turn && (
                <text
                  x="4"
                  y="4.6"
                  fontSize="0.4"
                  fill="green"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {(myColor === "r" && turn === "r") ||
                  (myColor === "b" && turn === "b")
                    ? "Lượt của bạn !"
                    : "Chờ đối thủ"}
                </text>
              )}

              {/* Position markers */}
              {[
                // Cannon positions
                [1, 2],
                [7, 2],
                [1, 7],
                [7, 7],
                // Soldier positions
                [0, 3],
                [2, 3],
                [4, 3],
                [6, 3],
                [8, 3],
                [0, 6],
                [2, 6],
                [4, 6],
                [6, 6],
                [8, 6],
              ]
                .filter(([x]) => x <= 8) // Đảm bảo không vẽ các điểm nằm ngoài bàn cờ
                .map(([x, y], i) => (
                  <g key={`marker-${i}`} pointerEvents="none">
                    {/* Top left */}
                    {x > 0 && y > 0 && (
                      <path
                        d={`M${x - 0.2},${y} L${x - 0.2},${y - 0.2} L${x},${
                          y - 0.2
                        }`}
                        stroke="#8B4513"
                        strokeWidth="0.05"
                        fill="none"
                      />
                    )}
                    {/* Top right */}
                    {x < 8 && y > 0 && (
                      <path
                        d={`M${x + 0.2},${y} L${x + 0.2},${y - 0.2} L${x},${
                          y - 0.2
                        }`}
                        stroke="#8B4513"
                        strokeWidth="0.05"
                        fill="none"
                      />
                    )}
                    {/* Bottom left */}
                    {x > 0 && y < 9 && (
                      <path
                        d={`M${x - 0.2},${y} L${x - 0.2},${y + 0.2} L${x},${
                          y + 0.2
                        }`}
                        stroke="#8B4513"
                        strokeWidth="0.05"
                        fill="none"
                      />
                    )}
                    {/* Bottom right */}
                    {x < 8 && y < 9 && (
                      <path
                        d={`M${x + 0.2},${y} L${x + 0.2},${y + 0.2} L${x},${
                          y + 0.2
                        }`}
                        stroke="#8B4513"
                        strokeWidth="0.05"
                        fill="none"
                      />
                    )}
                  </g>
                ))}

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
                      fill="green"
                      opacity="0.6"
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
                        {/* Shadow */}
                        <circle
                          cx={piece.x}
                          cy={piece.y}
                          r="0.4"
                          fill="rgba(0,0,0,0.2)"
                          transform="translate(0.03, 0.03)"
                          pointerEvents="none"
                        />
                        {/* Piece background */}
                        <circle
                          cx={piece.x}
                          cy={piece.y}
                          r="0.38"
                          fill={piece.color === "r" ? "#FFEBEE" : "#263238"}
                          stroke={piece.color === "r" ? "#D32F2F" : "#455A64"}
                          strokeWidth="0.05"
                        />
                        {/* Piece text */}
                        <text
                          x={piece.x}
                          y={piece.y}
                          fontSize="0.35"
                          fill={piece.color === "r" ? "#D32F2F" : "#FFFFFF"}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          pointerEvents="none"
                        >
                          {piece.color === "r"
                            ? redSymbols[piece.type as keyof typeof redSymbols]
                            : blackSymbols[
                                piece.type as keyof typeof blackSymbols
                              ]}
                        </text>
                        {/* Current turn indicator */}
                        {turn === piece.color && (
                          <circle
                            cx={piece.x}
                            cy={piece.y}
                            r="0.45"
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth="0.03"
                            pointerEvents="none"
                          />
                        )}
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

      {/* Player info (bottom) */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-4 mt-4 flex items-center">
        {/* Player2 (Black player) details */}
        <Avatar className="h-10 w-10 border border-gray-300 shadow-sm">
          <AvatarImage src="/placeholder.svg" alt={player2?.username} />
          <AvatarFallback>
            {player2?.username?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center">
          <p className="font-medium">
            {player2?.username} {user?.id === player2?.id && "(Bạn)"}
          </p>
          <span>ELO: {player2?.elo}</span>
        </div>
        <span className="ml-auto text-sm font-mono">
          <Clock className="inline-block w-4 h-4 mr-1" />
          {players.black.timeLeft}
        </span>
      </div>

      {/* Surrender Confirmation Dialog */}
      {showSurrenderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-xl font-bold mb-4">Đầu hàng</h2>
            <p className="mb-6">Bạn có chắc chắn muốn đầu hàng?</p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleConfirmSurrender}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Đồng ý
              </Button>
              <Button onClick={handleCancelSurrender} variant="outline">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Request Dialog */}
      {showDrawRequestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-xl font-bold mb-4">Cầu hòa</h2>
            <p className="mb-6">Bạn có chắc chắn muốn gửi yêu cầu cầu hòa?</p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleConfirmDrawRequest}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Gửi yêu cầu
              </Button>
              <Button onClick={handleCancelDrawRequest} variant="outline">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Response Dialog */}
      {showDrawResponseDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-xl font-bold mb-4">Yêu cầu cầu hòa</h2>
            <p className="mb-6">
              Đối thủ muốn cầu hòa. Bạn có chấp nhận không?
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => handleDrawResponse(true)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Chấp nhận
              </Button>
              <Button
                onClick={() => handleDrawResponse(false)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
