"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export type ClockState = {
  redMs: number;
  blackMs: number;
  turn: string;
  receivedAt: number;
} | null;

// Định dạng mm:ss
export function formatClock(ms: number | null) {
  if (ms === null) return "--:--";
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Sắp hết giờ: dưới 60s đỏ, dưới 10s nhấp nháy
function urgency(ms: number | null) {
  if (ms === null) return "";
  if (ms < 10_000) return "text-primary animate-pulse";
  if (ms < 60_000) return "text-primary";
  return "";
}

// Đồng hồ tự đếm lùi trong chính nó, nên mỗi lần nhảy giây chỉ vẽ lại ô nhỏ này
// thay vì cả bàn cờ. Chỉ bên đang đi mới chạy bộ đếm; server vẫn quyết định hết giờ.
export function LiveClock({ clock, side }: { clock: ClockState; side: "r" | "b" }) {
  const running = !!clock && clock.turn === side;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running, clock]);

  let remaining: number | null = null;
  if (clock) {
    const base = side === "r" ? clock.redMs : clock.blackMs;
    remaining = Math.max(0, base - (running ? now - clock.receivedAt : 0));
  }

  return (
    <div className={`flex shrink-0 items-center gap-1.5 rounded-md bg-background/80 px-3 py-1.5 ring-1 ring-[#B9863A]/35 ${urgency(remaining)}`}>
      <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="tabular text-xl font-semibold leading-none">{formatClock(remaining)}</span>
    </div>
  );
}
