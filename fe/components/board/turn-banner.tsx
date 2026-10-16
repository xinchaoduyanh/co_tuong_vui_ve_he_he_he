import { PieceBadge } from "@/components/board/seal";

// Biển báo lượt: chữ lớn, rõ. Lượt của mình thì nhấp nháy màu chu sa; lượt đối thủ thì mờ hơn.
export function TurnBanner({
  mine,
  side,
  opponentName,
}: {
  mine: boolean;
  side: "r" | "b";
  opponentName?: string | null;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`panel-frame flex items-center justify-center gap-3 rounded-lg px-4 py-3 text-center transition-colors ${
        mine ? "xq-turn-mine bg-primary/12" : "bg-card"
      }`}
    >
      <PieceBadge side={side} size={34} glow={mine} />
      <div className="min-w-0">
        <p
          className={`font-display text-2xl font-bold uppercase leading-none tracking-[0.06em] sm:text-3xl ${
            mine ? "xq-turn-text text-primary" : "text-muted-foreground"
          }`}
        >
          {mine ? "Đến lượt bạn" : "Lượt đối thủ"}
        </p>
        <p className="mt-1.5 truncate text-sm text-muted-foreground">
          {mine ? "Chọn một quân rồi bấm ô đến" : `${opponentName ?? "Đối thủ"} đang suy nghĩ`}
          {!mine && <span className="xq-dots" aria-hidden />}
        </p>
      </div>
    </div>
  );
}
