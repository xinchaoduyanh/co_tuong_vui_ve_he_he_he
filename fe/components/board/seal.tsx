// Con dấu đỏ kiểu ấn triện: chữ Hán khắc trên ô vuông chu sa, hơi nghiêng như đóng tay
export function Seal({
  char,
  size = 28,
  className = "",
  tilt = -4,
}: {
  char: string;
  size?: number;
  className?: string;
  tilt?: number;
}) {
  return (
    <span
      aria-hidden
      className={`font-han inline-flex shrink-0 items-center justify-center rounded-[4px] bg-primary leading-none text-primary-foreground shadow-[inset_0_0_0_1.5px_hsl(var(--primary-foreground)/0.35)] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.62, transform: `rotate(${tilt}deg)` }}
    >
      {char}
    </span>
  );
}

// Đĩa quân nhỏ làm huy hiệu bên cờ (帥 đỏ / 將 đen)
export function PieceBadge({
  side,
  size = 44,
  glow = false,
}: {
  side: "r" | "b";
  size?: number;
  glow?: boolean;
}) {
  const ink = side === "r" ? "#C0281B" : "#1B1B1B";
  const glyph = side === "r" ? "帥" : "將";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className={glow ? "xq-badge-glow" : undefined}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`badge-${side}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#F8E9BF" />
          <stop offset="0.55" stopColor="#E5C584" />
          <stop offset="1" stopColor="#C99B55" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="22" r="18" fill="#2A1A0A" opacity="0.35" />
      <circle cx="20" cy="20" r="18" fill={`url(#badge-${side})`} stroke="#8A5E2E" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14.4" fill="none" stroke="#9A6B30" strokeOpacity="0.85" strokeWidth="1" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fontSize="19" fontWeight="700" fill={ink} className="font-han">
        {glyph}
      </text>
    </svg>
  );
}
