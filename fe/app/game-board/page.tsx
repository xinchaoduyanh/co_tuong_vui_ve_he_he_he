"use client";
import type React from "react";

import { Button } from "@/components/ui/button";
import {
  Bot,
  ChevronLeft,
  Flag,
  Handshake,
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
import {
  GameResultOverlay,
  GameResultView,
} from "@/components/game-result-overlay";
import { LeaveConfirmDialog } from "@/components/leave-confirm-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlayerBar } from "@/components/board/player-bar";
import { clearMatchStorage } from "@/lib/match-storage";
import { BoardSurface } from "@/components/board/board-surface";
import { PieceDisc } from "@/components/board/piece-disc";
import { playSound } from "@/lib/game-effects";
import {
  BoardEffectsStyles,
  Burst,
  CaptureBurst,
} from "@/components/board-effects";

// "p 0,3 -> 0,4" -> "Tốt đỏ: cột 1 hàng 4 → cột 1 hàng 5" (chữ thường là quân đỏ)
const PIECE_NAMES: Record<string, string> = {
  k: "Tướng", a: "Sĩ", e: "Tượng", h: "Mã", r: "Xe", c: "Pháo", p: "Tốt",
};
function describeMove(text: string | null | undefined) {
  const m = text?.match(/^(\w) (\d),(\d) -> (\d),(\d)$/);
  if (!m) return null;
  const name = PIECE_NAMES[m[1].toLowerCase()] ?? m[1];
  const side = m[1] === m[1].toLowerCase() ? "đỏ" : "đen";
  return `${name} ${side}: cột ${+m[2] + 1} hàng ${+m[3] + 1} → cột ${+m[4] + 1} hàng ${+m[5] + 1}`;
}

// Định dạng mm:ss cho đồng hồ
function formatClock(ms: number | null) {
  if (ms === null) return "--:--";
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Đổi màu khi sắp hết giờ: <60s đỏ, <10s nhấp nháy
function clockClass(ms: number | null) {
  if (ms === null) return "";
  if (ms < 10_000) return "text-primary animate-pulse";
  if (ms < 60_000) return "text-primary";
  return "";
}

export default function GameBoard() {
  const { stompClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const [boardState, setBoardState] = useState<string>(
    "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR"
  );
  const [isCheck, setIsCheck] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [moveDescription, setMoveDescription] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true);
  soundRef.current = soundEnabled;
  // Hiệu ứng nước đi: ô đi/đến gần nhất và các đợt ăn quân đang chạy
  const [lastMove, setLastMove] = useState<{
    fromX: number; fromY: number; toX: number; toY: number; id: number;
  } | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const prevBoardRef = useRef<string | null>(null);
  const fxId = useRef(0);
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
  // Đồng hồ: mốc thời gian từ server; FE chỉ đếm lùi để hiển thị, server quyết định hết giờ
  const [clock, setClock] = useState<{
    redMs: number;
    blackMs: number;
    turn: string;
    receivedAt: number;
  } | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  // Kết quả trận: có giá trị khi trận đã kết thúc (hiện overlay, không cần xác nhận khi rời)
  const [gameResult, setGameResult] = useState<GameResultView | null>(null);
  const gameOver = gameResult !== null;
  // Hành động rời trận đang chờ người chơi xác nhận
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);

  const {
    matchId,
    player1,
    player2,
    pieces,
    setPieces,
    turn,
    setTurn,
    isLoading,
    error,
    makeMove,
    players,
    snapshot,
  } = useGameState();

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
      // Hiệu ứng: quân bị ăn nếu ô đến trước đó có quân
      const prev = prevBoardRef.current;
      const hasMoveInfo = [data.fromX, data.fromY, data.toX, data.toY].every(
        (v) => typeof v === "number"
      );
      if (hasMoveInfo) {
        fxId.current += 1;
        const id = fxId.current;
        setLastMove({ fromX: data.fromX, fromY: data.fromY, toX: data.toX, toY: data.toY, id });
        const capturedChar = prev ? prev[data.toY * 9 + data.toX] : ".";
        if (capturedChar && capturedChar !== ".") {
          const color = capturedChar === capturedChar.toLowerCase() ? "r" : "b";
          setBursts((list) => [...list, { id, x: data.toX, y: data.toY, color }]);
          setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1100);
          playSound("capture", soundRef.current);
        } else {
          playSound("move", soundRef.current);
        }
        if (data.isCheck && !data.isCheckmate) {
          setTimeout(() => playSound("check", soundRef.current), 250);
        }
      }
      prevBoardRef.current = data.boardState;
      setBoardState(data.boardState);
      setTurn(data.nextTurn);
      setMoveDescription(data.moveDescription);
      if (data.redTimeMs != null && data.blackTimeMs != null) {
        setClock({
          redMs: data.redTimeMs,
          blackMs: data.blackTimeMs,
          turn: data.nextTurn,
          receivedAt: Date.now(),
        });
      }
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

  // Đồng bộ đồng hồ định kỳ từ server
  useEffect(() => {
    if (!stompClient || !isConnected || !matchId) return;
    const sub = stompClient.subscribe(`/topic/match.${matchId}.clock`, (msg) => {
      const data = JSON.parse(msg.body);
      setClock({
        redMs: data.redTimeMs,
        blackMs: data.blackTimeMs,
        turn: data.turn,
        receivedAt: Date.now(),
      });
    });
    return () => sub.unsubscribe();
  }, [stompClient, isConnected, matchId]);

  // Đếm lùi cục bộ mỗi 200ms khi đã có đồng hồ
  useEffect(() => {
    if (!clock) return;
    const timer = setInterval(() => setClockNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [clock]);

  const remainingOf = (side: "r" | "b") => {
    if (!clock) return null;
    const base = side === "r" ? clock.redMs : clock.blackMs;
    const elapsed = clock.turn === side ? clockNow - clock.receivedAt : 0;
    return Math.max(0, base - elapsed);
  };

  // Khi có trạng thái mới từ server (mở trang, kết nối lại): đồng bộ bàn cờ, chiếu và đồng hồ
  useEffect(() => {
    if (!snapshot) return;
    prevBoardRef.current = snapshot.boardState;
    setBoardState(snapshot.boardState);
    setIsCheck(snapshot.check);
    setMoveDescription(snapshot.moveDescription ?? "");
    setClock({
      redMs: snapshot.redTimeMs,
      blackMs: snapshot.blackTimeMs,
      turn: snapshot.turn,
      receivedAt: Date.now(),
    });
  }, [snapshot]);

  // Thông báo khi đối thủ mất kết nối hoặc quay lại
  useEffect(() => {
    if (!stompClient || !isConnected || !matchId) return;
    const sub = stompClient.subscribe(`/topic/match.${matchId}.presence`, (msg) => {
      const data = JSON.parse(msg.body);
      if (data.username === user?.username) return;
      if (data.status === "DISCONNECTED") {
        showNotification({
          severity: "warn",
          summary: "Đối thủ mất kết nối",
          detail: `${data.username} mất kết nối. Nếu không quay lại trong 60 giây, trận sẽ kết thúc.`,
          life: 8000,
        });
      } else if (data.status === "RECONNECTED") {
        showNotification({
          severity: "success",
          summary: "Đối thủ đã kết nối lại",
          detail: `${data.username} đã quay lại trận.`,
          life: 4000,
        });
      }
    });
    return () => sub.unsubscribe();
  }, [stompClient, isConnected, matchId, user?.username, showNotification]);

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

        const isRed = data.player1 && data.player1.id === myId;
        const myEloChange = isRed ? data.player1EloChange : data.player2EloChange;
        const opponentEloChange = isRed ? data.player2EloChange : data.player1EloChange;
        const outcome =
          data.winner === "DRAW"
            ? "draw"
            : (data.winner === "red") === Boolean(isRed)
            ? "win"
            : "lose";
        setGameResult({
          outcome,
          reason: data.reason ?? null,
          myEloChange,
          opponentEloChange,
          opponentName: (isRed ? data.player2?.username : data.player1?.username) ?? null,
        });
        setIsCheck(false);
        playSound(outcome === "lose" ? "lose" : "win", soundRef.current);
        clearMatchStorage();
      }
    });
    return () => sub.unsubscribe();
  }, [stompClient, isConnected, matchId, user, router, showNotification]);

  // Trận đã kết thúc từ trước (mở lại link): hiện kết quả từ snapshot
  useEffect(() => {
    if (!snapshot || snapshot.status !== "ENDED") return;
    const isRed = snapshot.players.red?.id === user?.id;
    const outcome =
      snapshot.winner === "DRAW" || !snapshot.winner
        ? "draw"
        : (snapshot.winner === "red") === isRed
        ? "win"
        : "lose";
    setGameResult({
      outcome,
      reason: snapshot.endReason,
      myEloChange: null,
      opponentEloChange: null,
      opponentName: null,
    });
    clearMatchStorage();
  }, [snapshot, user?.id]);

  // Rời trận: nếu đang chơi thì hỏi xác nhận, đồng ý thì đầu hàng rồi mới rời
  const requestLeave = (action: () => void) => {
    if (gameOver) {
      action();
      return;
    }
    setLeaveAction(() => action);
  };

  const confirmLeave = () => {
    const action = leaveAction;
    setLeaveAction(null);
    if (matchId && stompClient?.connected && user?.id) {
      stompClient.publish({
        destination: "/app/game.surrender",
        body: JSON.stringify({ matchId, playerId: user.id }),
      });
    }
    action?.();
  };

  // Đóng tab / tải lại giữa trận: trình duyệt hiện hộp xác nhận mặc định (không tính là đầu hàng)
  useEffect(() => {
    if (gameOver) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [gameOver]);

  // Nút Back của trình duyệt: giữ lại trang và hỏi xác nhận
  useEffect(() => {
    if (gameOver) return;
    window.history.pushState({ inGame: true }, "");
    const onPopState = () => {
      window.history.pushState({ inGame: true }, "");
      setLeaveAction(() => () => router.push("/"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [gameOver, router]);

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
        detail: `Xin chào đến với game đấu, đối thủ của bạn là ${
          opponent.username
        }, bạn xuất phát với quân ${myColor === "r" ? "đỏ" : "đen"} xin hãy ${
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

  if (error && !isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-semibold">Không mở được trận</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <Button asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-3 px-3 pt-4" aria-busy="true">
        <div className="h-[68px] animate-pulse rounded-lg bg-card" />
        <div className="aspect-[10/11] w-full animate-pulse rounded-xl bg-card" />
        <div className="h-[68px] animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  const redName = player1?.username;
  const blackName = player2?.username;
  const iAmRed = user?.id === player1?.id;
  const iAmBlack = user?.id === player2?.id;
  const actionsDisabled = gameOver || !isConnected || !stompClient;

  const redBar = (
    <PlayerBar
      name={redName}
      elo={player1?.elo}
      isMe={iAmRed}
      side="r"
      active={!gameOver && turn === "r"}
      clockText={formatClock(remainingOf("r"))}
      clockClassName={clockClass(remainingOf("r"))}
    />
  );
  const blackBar = (
    <PlayerBar
      name={blackName}
      elo={player2?.elo}
      isMe={iAmBlack}
      side="b"
      active={!gameOver && turn === "b"}
      clockText={formatClock(remainingOf("b"))}
      clockClassName={clockClass(remainingOf("b"))}
    />
  );
  const lastMoveText = describeMove(moveDescription);

  const actionButtons = (
    <>
      <Button variant="outline" className="flex-1" onClick={handleDrawRequest} disabled={actionsDisabled}>
        <Handshake />
        Cầu hòa
      </Button>
      <Button
        variant="outline"
        className="flex-1 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
        onClick={handleSurrender}
        disabled={gameOver}
      >
        <Flag />
        Đầu hàng
      </Button>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 pb-[calc(84px+env(safe-area-inset-bottom))] pt-3 lg:px-6 lg:pb-10 lg:pt-6">
      <header className="mb-3 flex items-center gap-2 lg:mb-5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Rời trận"
          onClick={() => requestLeave(() => router.push("/"))}
        >
          <ChevronLeft />
        </Button>
        <h1 className="font-display text-xl font-bold">Cờ Tướng</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => requestLeave(() => router.push("/ai-game-board"))}
          >
            <Bot />
            <span className="hidden sm:inline">Chơi với máy</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            onClick={() => setSoundEnabled((v) => !v)}
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </Button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,640px)_minmax(300px,1fr)] lg:items-start lg:gap-10">
        <section aria-label="Bàn cờ" className="mx-auto w-full max-w-[640px]">
          <div className="mb-3 lg:hidden">{redBar}</div>

          <div className="relative overflow-hidden rounded-xl shadow-[0_28px_60px_-28px_hsl(150_14%_2%/0.9)]">
            {isCheck && !isCheckmate && !gameOver && (
              <div
                role="alert"
                className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto w-fit rounded-md bg-primary px-4 py-1.5 font-display text-lg font-bold text-primary-foreground shadow-lg"
              >
                {turn === myColor ? "Chiếu tướng! Tướng bạn đang bị chiếu" : "Chiếu tướng đối thủ!"}
              </div>
            )}
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

              <BoardEffectsStyles />
              {/* Nước đi gần nhất: ô xuất phát và ô đến */}
              {lastMove && (
                <g pointerEvents="none" className="xq-lastmove">
                  <rect x={lastMove.fromX - 0.45} y={lastMove.fromY - 0.45} width="0.9" height="0.9"
                    rx="0.12" fill="rgba(255,193,7,0.18)" stroke="#FFB300" strokeWidth="0.04" strokeDasharray="0.12,0.08" />
                  <rect x={lastMove.toX - 0.47} y={lastMove.toY - 0.47} width="0.94" height="0.94"
                    rx="0.14" fill="rgba(255,193,7,0.28)" stroke="#FFB300" strokeWidth="0.06" />
                </g>
              )}

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

                    // Quân vừa đi tới: trượt từ ô cũ sang ô mới rồi nảy nhẹ
                    const justMoved =
                      lastMove &&
                      lastMove.toX === piece.x &&
                      lastMove.toY === piece.y;

                    return (
                      <g
                        key={`piece-${piece.type}-${piece.color}-${piece.x}-${piece.y}`}
                        className={justMoved ? "xq-slide" : undefined}
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
                          ...(justMoved
                            ? ({
                                ["--dx" as any]: `${lastMove.fromX - lastMove.toX}px`,
                                ["--dy" as any]: `${lastMove.fromY - lastMove.toY}px`,
                              } as React.CSSProperties)
                            : {}),
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
                            stroke="#E3B65B"
                            strokeWidth="0.06"
                            pointerEvents="none"
                          />
                        )}
                        {/* Tướng đang bị chiếu: viền đỏ nhấp nháy */}
                        {isCheck &&
                          !isCheckmate &&
                          piece.type === "G" &&
                          piece.color === turn && (
                            <circle
                              cx={piece.x}
                              cy={piece.y}
                              r="0.48"
                              fill="none"
                              stroke="#E53935"
                              strokeWidth="0.08"
                              pointerEvents="none"
                              className="animate-pulse"
                            />
                          )}
                        {/* Hiệu ứng quân bị ăn */}
                        {canBeCaptured && (
                          <circle
                            cx={piece.x}
                            cy={piece.y}
                            r="0.5"
                            fill="none"
                            stroke="#D8432E"
                            strokeWidth="0.07"
                            strokeDasharray="0.1,0.1"
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  })}
              {/* Hiệu ứng ăn quân (vẽ trên cùng) */}
              {bursts.map((b) => (
                <CaptureBurst key={b.id} burst={b} />
              ))}
            </svg>
            </div>
          </div>

          <div className="mt-3 lg:hidden">{blackBar}</div>
        </section>

        <aside className="hidden flex-col gap-3 lg:flex" aria-label="Thông tin trận">
          {redBar}
          <div className="rounded-lg bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">Nước vừa đi</p>
            <p className="tabular mt-0.5 min-h-[1.5rem] font-medium">{lastMoveText ?? "Chưa có nước đi"}</p>
          </div>
          {blackBar}
          <div className="mt-2 flex gap-2">{actionButtons}</div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-header border-t border-border bg-background px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 lg:hidden">
        <div className="mx-auto flex max-w-[640px] gap-2">{actionButtons}</div>
      </div>

      {gameResult && (
        <GameResultOverlay
          result={gameResult}
          onHome={() => router.push("/")}
          onHistory={() => router.push("/lich-su-dau")}
        />
      )}

      <LeaveConfirmDialog
        open={leaveAction !== null}
        onStay={() => setLeaveAction(null)}
        onLeave={confirmLeave}
      />

      <ConfirmDialog
        open={showSurrenderDialog}
        title="Đầu hàng"
        description="Bạn có chắc chắn muốn đầu hàng? Ván này sẽ tính là thua."
        confirmLabel="Đầu hàng"
        cancelLabel="Hủy"
        onConfirm={handleConfirmSurrender}
        onCancel={handleCancelSurrender}
      />

      <ConfirmDialog
        open={showDrawRequestDialog}
        title="Cầu hòa"
        description="Gửi lời cầu hòa tới đối thủ?"
        confirmLabel="Gửi yêu cầu"
        cancelLabel="Hủy"
        onConfirm={handleConfirmDrawRequest}
        onCancel={handleCancelDrawRequest}
      />

      <ConfirmDialog
        open={showDrawResponseDialog}
        title="Đối thủ cầu hòa"
        description="Đối thủ muốn hòa ván này. Bạn có chấp nhận không?"
        confirmLabel="Chấp nhận"
        cancelLabel="Từ chối"
        onConfirm={() => handleDrawResponse(true)}
        onCancel={() => handleDrawResponse(false)}
      />
    </div>
  );
}
