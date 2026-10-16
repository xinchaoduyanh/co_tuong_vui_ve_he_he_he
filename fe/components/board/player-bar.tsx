import type { ReactNode } from "react";
import { PieceBadge } from "@/components/board/seal";
import { RankBadge } from "@/components/rank-badge";

// Thanh chiến tích: thắng / hòa / thua theo tỉ lệ
function RecordBar({ wins, loses, draws }: { wins: number; loses: number; draws: number }) {
  const total = wins + loses + draws;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  return (
    <div title={`${wins} thắng · ${draws} hòa · ${loses} thua`} className="mt-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <span className="bg-success" style={{ width: `${pct(wins)}%` }} />
        <span className="bg-warning" style={{ width: `${pct(draws)}%` }} />
        <span className="bg-primary" style={{ width: `${pct(loses)}%` }} />
      </div>
      <p className="tabular mt-1 text-xs text-muted-foreground">
        {total === 0 ? "Chưa có chiến tích" : `${wins} thắng${draws ? ` · ${draws} hòa` : ""} · ${loses} thua`}
      </p>
    </div>
  );
}

// Biển hiệu kỳ thủ kiểu bảng gỗ sơn mài: huy hiệu quân bên cờ, tên, hạng, chiến tích, đồng hồ.
// Bên đang đến lượt có viền chu sa và huy hiệu phát sáng.
export function PlayerBar({
  name,
  elo,
  wins,
  loses,
  draws,
  isMe,
  side,
  active,
  clock,
}: {
  name?: string | null;
  elo?: number | null;
  wins?: number;
  loses?: number;
  draws?: number;
  isMe: boolean;
  side: "r" | "b";
  active: boolean;
  clock?: ReactNode;
}) {
  const hasRecord = typeof wins === "number" && typeof loses === "number" && typeof draws === "number";
  return (
    <div
      className={`panel-lacquer panel-frame meander-top flex items-center gap-3 rounded-lg px-3 pb-2.5 pt-4 transition-shadow ${
        active ? "xq-bar-active" : ""
      }`}
      aria-label={active ? `${name}, đang đến lượt` : name ?? undefined}
    >
      <PieceBadge side={side} size={48} glow={active} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-semibold leading-tight">{name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
          {isMe && (
            <span className="shrink-0 -rotate-3 rounded-[3px] bg-primary px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
              Bạn
            </span>
          )}
          <RankBadge elo={elo} compact />
          <span className="tabular">Elo {elo ?? "—"}</span>
        </p>
        {hasRecord && <RecordBar wins={wins!} loses={loses!} draws={draws!} />}
      </div>
      {clock}
    </div>
  );
}
