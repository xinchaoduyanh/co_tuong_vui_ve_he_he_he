import { Clock } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";

// Thanh người chơi: avatar, tên, Elo, bên cờ và đồng hồ. Bên đang đến lượt có viền chu sa và chấm nhấp nháy.
export function PlayerBar({
  name,
  elo,
  isMe,
  side,
  active,
  clockText,
  clockClassName,
}: {
  name?: string | null;
  elo?: number | null;
  isMe: boolean;
  side: "r" | "b";
  active: boolean;
  clockText?: string;
  clockClassName?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        active ? "bg-secondary ring-1 ring-primary/70" : "bg-card"
      }`}
      aria-label={active ? `${name}, đang đến lượt` : name ?? undefined}
    >
      <PlayerAvatar
        name={name}
        className="h-11 w-11 shrink-0"
        ringColor={side === "r" ? "#C0281B" : "#4A4A4A"}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 leading-tight">
          {active && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />}
          <span className="truncate font-semibold">{name}</span>
          {isMe && <span className="shrink-0 rounded-sm bg-foreground/10 px-1.5 text-xs font-medium">Bạn</span>}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          <span className="tabular">Elo {elo ?? "—"}</span>
          {" · "}
          {side === "r" ? "Quân đỏ" : "Quân đen"}
        </p>
      </div>
      {clockText !== undefined && (
        <div className={`flex shrink-0 items-center gap-1.5 rounded-md bg-background/70 px-2.5 py-1.5 ${clockClassName ?? ""}`}>
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="tabular text-xl font-semibold leading-none">{clockText}</span>
        </div>
      )}
    </div>
  );
}
