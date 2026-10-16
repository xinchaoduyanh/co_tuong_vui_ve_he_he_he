import type { ReactNode } from "react";
import { PieceBadge } from "@/components/board/seal";

// Bảng người chơi kiểu khung gỗ sơn mài: huy hiệu quân bên cờ, tên, Elo, đồng hồ.
// Bên đang đến lượt có viền chu sa và huy hiệu phát sáng.
export function PlayerBar({
  name,
  elo,
  isMe,
  side,
  active,
  clock,
}: {
  name?: string | null;
  elo?: number | null;
  isMe: boolean;
  side: "r" | "b";
  active: boolean;
  clock?: ReactNode;
}) {
  return (
    <div
      className={`panel-lacquer panel-frame flex items-center gap-3 rounded-lg px-3 py-2.5 transition-shadow ${
        active ? "xq-bar-active" : ""
      }`}
      aria-label={active ? `${name}, đang đến lượt` : name ?? undefined}
    >
      <PieceBadge side={side} size={46} glow={active} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-semibold leading-tight">{name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
          {isMe && (
            <span className="shrink-0 -rotate-3 rounded-[3px] bg-primary px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
              Bạn
            </span>
          )}
          <span className="tabular truncate">Elo {elo ?? "—"}</span>
        </p>
      </div>
      {clock}
    </div>
  );
}
