"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Seal } from "@/components/board/seal";
import { RESULT_PROVERBS } from "@/lib/culture";

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

const CONFETTI_COLORS = ["#D8432E", "#E3B65B", "#3FA37F", "#ECE6D6", "#B9863A"];

const OUTCOME_TITLE: Record<GameOutcome, string> = {
  win: "Bạn thắng!",
  lose: "Bạn thua",
  draw: "Hòa cờ",
};

const OUTCOME_COLOR: Record<GameOutcome, string> = {
  win: "text-success",
  lose: "text-primary",
  draw: "text-warning",
};

function formatElo(change: number | null) {
  if (change === null) return "";
  return `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}`;
}

function eloTone(change: number | null) {
  if (change === null || change === 0) return "text-muted-foreground";
  return change > 0 ? "text-success" : "text-primary";
}

// Pháo giấy CSS thuần, chỉ hiện khi thắng
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 12) * 0.15}s`,
        duration: `${2.6 + (i % 5) * 0.4}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + (i % 4) * 2,
      })),
    []
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      <style>{`
        @keyframes xiangqi-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-[1px]"
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
  return (
    <div className="fixed inset-0 z-overlay flex items-end justify-center bg-background/85 p-4 sm:items-center">
      {result.outcome === "win" && <Confetti />}
      <div
        role="dialog"
        aria-labelledby="result-title"
        className="rise relative w-full max-w-md rounded-lg bg-card p-7 shadow-[0_30px_80px_-24px_hsl(150_14%_3%/0.9)] ring-1 ring-border"
      >
        <p className="text-sm text-muted-foreground">
          {result.reason ? reasonLabel(result.reason) : "Kết thúc trận"}
        </p>
        <Seal
          char={result.outcome === "win" ? "勝" : result.outcome === "lose" ? "敗" : "和"}
          size={44}
          tilt={-6}
          className="absolute right-6 top-6"
        />
        <h2
          id="result-title"
          className={`mt-1 font-display text-5xl font-bold leading-none sm:text-6xl ${OUTCOME_COLOR[result.outcome]}`}
        >
          {OUTCOME_TITLE[result.outcome]}
        </h2>

        {result.myEloChange !== null && (
          <dl className="mt-7 grid grid-cols-2 gap-6 border-t border-border pt-5">
            <div>
              <dt className="text-sm text-muted-foreground">Elo của bạn</dt>
              <dd className={`tabular mt-1 font-display text-3xl font-semibold ${eloTone(result.myEloChange)}`}>
                {formatElo(result.myEloChange)}
              </dd>
            </div>
            {result.opponentName && result.opponentEloChange !== null && (
              <div>
                <dt className="truncate text-sm text-muted-foreground">Elo của {result.opponentName}</dt>
                <dd className={`tabular mt-1 font-display text-3xl font-semibold ${eloTone(result.opponentEloChange)}`}>
                  {formatElo(result.opponentEloChange)}
                </dd>
              </div>
            )}
          </dl>
        )}

        <figure className="mt-6 border-t border-border pt-4">
          <blockquote className="font-han text-lg font-bold text-primary">{RESULT_PROVERBS[result.outcome].han}</blockquote>
          <figcaption className="mt-1 text-sm text-muted-foreground">{RESULT_PROVERBS[result.outcome].vi}</figcaption>
        </figure>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onHistory}>
            Xem lịch sử
          </Button>
          <Button onClick={onHome}>Về trang chủ</Button>
        </div>
      </div>
    </div>
  );
}
