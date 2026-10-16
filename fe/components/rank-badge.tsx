import { rankOf } from "@/lib/rank";

// Huy hiệu hạng: đĩa tròn màu theo hạng, viền đứt nét như mép ấn, chữ Hán của quân
export function RankMedal({ elo, size = 24 }: { elo?: number | null; size?: number }) {
  const rank = rankOf(elo);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="11" fill={rank.fill} />
      <circle cx="12" cy="12" r="10" fill="none" stroke={rank.ring} strokeWidth="1" strokeDasharray="1.6 1.2" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke={rank.ring} strokeOpacity="0.5" strokeWidth="0.6" />
      <text x="12" y="12.6" textAnchor="middle" dominantBaseline="central" fontSize="12.5" fontWeight="700" fill="#FFF6E6" className="font-han">
        {rank.char}
      </text>
    </svg>
  );
}

// Huy hiệu hạng kèm danh xưng
export function RankBadge({ elo, compact = false }: { elo?: number | null; compact?: boolean }) {
  const rank = rankOf(elo);
  return (
    <span className="inline-flex items-center gap-1.5" title={rank.title}>
      <RankMedal elo={elo} size={compact ? 24 : 28} />
      <span className="font-medium text-foreground">{compact ? rank.name : rank.title}</span>
    </span>
  );
}
