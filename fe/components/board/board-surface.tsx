// Mặt bàn cờ vẽ bằng SVG. Hệ toạ độ: lưới 0..8 x 0..9, viewBox "-1 -1 10 11".
// Ảnh vân gỗ do agy sinh ở public/fx/board-wood.jpg; thiếu ảnh thì còn màu gỗ và vignette bên dưới.

const INK = "#4A3220";
const MARK_POINTS: Array<[number, number]> = [
  [1, 2], [7, 2], [1, 7], [7, 7],
  [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],
  [0, 6], [2, 6], [4, 6], [6, 6], [8, 6],
];

// Dấu góc quanh điểm pháo/tốt
function Marker({ x, y }: { x: number; y: number }) {
  const gap = 0.09;
  const len = 0.2;
  const corners: Array<[number, number]> = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  return (
    <g stroke={INK} strokeWidth="0.04" fill="none" strokeLinecap="round">
      {corners.map(([sx, sy]) => {
        if ((x === 0 && sx === -1) || (x === 8 && sx === 1)) return null;
        const cx = x + sx * gap;
        const cy = y + sy * gap;
        return (
          <path key={`${sx}${sy}`} d={`M${cx + sx * len},${cy} L${cx},${cy} L${cx},${cy + sy * len}`} />
        );
      })}
    </g>
  );
}

export function BoardSurface() {
  return (
    <g>
      <defs>
        <linearGradient id="xq-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A4630" />
          <stop offset="0.5" stopColor="#4B3220" />
          <stop offset="1" stopColor="#3A2516" />
        </linearGradient>
        <radialGradient id="xq-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#5A3A1A" stopOpacity="0" />
          <stop offset="1" stopColor="#5A3A1A" stopOpacity="0.38" />
        </radialGradient>
        <radialGradient id="xq-disc" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#F8E9BF" />
          <stop offset="0.55" stopColor="#E5C584" />
          <stop offset="1" stopColor="#C99B55" />
        </radialGradient>
        <filter id="xq-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.05" />
        </filter>
      </defs>

      {/* Khung gỗ óc chó */}
      <rect x="-1" y="-1" width="10" height="11" rx="0.18" fill="url(#xq-frame)" />
      <rect x="-0.93" y="-0.93" width="9.86" height="10.86" rx="0.14" fill="none" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="0.03" />

      {/* Mặt gỗ hoàng dương */}
      <rect x="-0.6" y="-0.6" width="9.2" height="10.2" rx="0.06" fill="#D9B87A" />
      <image href="/fx/board-wood.jpg" x="-0.6" y="-0.6" width="9.2" height="10.2" preserveAspectRatio="xMidYMid slice" />
      <rect x="-0.6" y="-0.6" width="9.2" height="10.2" rx="0.06" fill="url(#xq-vignette)" />

      {/* Dải sông */}
      <rect x="0" y="4" width="8" height="1" fill="#6E8C96" fillOpacity="0.14" />

      {/* Đường ngang */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`h-${i}`} x1="0" y1={i} x2="8" y2={i} stroke={INK} strokeWidth="0.045" />
      ))}

      {/* Đường dọc: hai biên chạy suốt, các đường trong ngắt ở sông */}
      {Array.from({ length: 9 }).map((_, i) =>
        i === 0 || i === 8 ? (
          <line key={`v-${i}`} x1={i} y1="0" x2={i} y2="9" stroke={INK} strokeWidth="0.045" />
        ) : (
          <g key={`v-${i}`} stroke={INK} strokeWidth="0.045">
            <line x1={i} y1="0" x2={i} y2="4" />
            <line x1={i} y1="5" x2={i} y2="9" />
          </g>
        )
      )}

      {/* Viền ngoài đậm */}
      <rect x="0" y="0" width="8" height="9" fill="none" stroke={INK} strokeWidth="0.09" />

      {/* Cung tướng */}
      <g stroke={INK} strokeWidth="0.045">
        <line x1="3" y1="0" x2="5" y2="2" />
        <line x1="5" y1="0" x2="3" y2="2" />
        <line x1="3" y1="7" x2="5" y2="9" />
        <line x1="5" y1="7" x2="3" y2="9" />
      </g>

      {/* Chữ sông bằng nét cọ */}
      <g
        className="font-han"
        fill={INK}
        fillOpacity="0.62"
        fontSize="0.5"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        pointerEvents="none"
        style={{ letterSpacing: "0.25em" }}
      >
        <text x="2" y="4.5">楚河</text>
        <text x="6" y="4.5">漢界</text>
      </g>

      {/* Dấu pháo và tốt */}
      {MARK_POINTS.map(([x, y]) => (
        <Marker key={`${x}-${y}`} x={x} y={y} />
      ))}
    </g>
  );
}
