"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";

export type GameOutcome = "win" | "lose" | "draw";

export interface GameResultView {
  outcome: GameOutcome;
  reason: string | null;
  myEloChange: number | null;
  opponentEloChange: number | null;
  opponentName: string | null;
}

const REASON_LABEL: Record<string, string> = {
  CHECKMATE: "Chiếu bí",
  STALEMATE: "Hết nước đi (bên hết nước thua)",
  TIMEOUT: "Hết giờ",
  SURRENDER: "Đầu hàng",
  ABANDON: "Đối thủ bỏ trận",
  DRAW_AGREED: "Hai bên thống nhất hòa",
};

export function reasonLabel(reason: string | null) {
  if (!reason) return "";
  return REASON_LABEL[reason] ?? reason;
}

const OUTCOME_TITLE: Record<GameOutcome, string> = {
  win: "Bạn thắng!",
  lose: "Bạn thua",
  draw: "Hòa cờ",
};

const CONFETTI_COLORS = ["#F44336", "#FFC107", "#4CAF50", "#2196F3", "#E91E63", "#9C27B0"];

function formatElo(change: number | null) {
  if (change === null) return "";
  return `${change > 0 ? "+" : ""}${change}`;
}

// Pháo giấy CSS thuần, chỉ hiện khi thắng
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 12) * 0.15}s`,
        duration: `${2.5 + (i % 5) * 0.4}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + (i % 4) * 2,
      })),
    []
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes xiangqi-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-sm"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animation: `xiangqi-confetti-fall ${p.duration} linear ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function GameResultOverlay({
  result,
  onHome,
  onHistory,
}: {
  result: GameResultView;
  onHome: () => void;
  onHistory: () => void;
}) {
  const titleColor =
    result.outcome === "win"
      ? "text-green-700"
      : result.outcome === "lose"
      ? "text-red-700"
      : "text-amber-700";

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white p-6 text-center shadow-2xl">
        {result.outcome === "win" && <Confetti />}
        <div className="relative">
          <h2 className={`text-2xl font-bold ${titleColor}`}>
            {OUTCOME_TITLE[result.outcome]}
          </h2>
          {result.reason && (
            <p className="mt-2 text-gray-700">
              Lý do: {reasonLabel(result.reason)}
            </p>
          )}
          {result.myEloChange !== null && (
            <div className="mt-4 space-y-1 text-sm text-gray-700">
              <p>
                Điểm Elo của bạn:{" "}
                <strong>{formatElo(result.myEloChange)}</strong>
              </p>
              {result.opponentName && result.opponentEloChange !== null && (
                <p>
                  Điểm Elo của {result.opponentName}:{" "}
                  <strong>{formatElo(result.opponentEloChange)}</strong>
                </p>
              )}
            </div>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={onHistory}>
              Xem lịch sử
            </Button>
            <Button onClick={onHome} className="bg-amber-600 text-white hover:bg-amber-700">
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
