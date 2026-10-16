import { memo } from "react";

// Quân cờ truyền thống: đĩa gỗ tiện sáng màu, chữ khắc đỏ (bên đỏ) hoặc mực đen (bên đen).
// Phải đặt bên trong <svg> có BoardSurface (dùng chung gradient #xq-disc và filter #xq-soft).

const RED_SYMBOLS: Record<string, string> = { G: "帥", A: "仕", E: "相", H: "傌", R: "俥", C: "炮", S: "兵" };
const BLACK_SYMBOLS: Record<string, string> = { G: "將", A: "士", E: "象", H: "馬", R: "車", C: "砲", S: "卒" };

function PieceDiscImpl({
  x,
  y,
  color,
  type,
  glow = false,
  lifted = false,
}: {
  x: number;
  y: number;
  color: "r" | "b";
  type: string;
  // "mine": đến lượt mình (vàng); "theirs": đến lượt đối thủ (chu sa mờ)
  glow?: false | "mine" | "theirs";
  lifted?: boolean;
}) {
  const glyph = (color === "r" ? RED_SYMBOLS : BLACK_SYMBOLS)[type] ?? "";
  const ink = color === "r" ? "#C0281B" : "#1B1B1B";
  return (
    <g className={lifted ? "xq-lifted" : undefined}>
      {glow && (
        <circle
          className={`xq-fx ${glow === "mine" ? "xq-glow-mine" : "xq-glow-theirs"}`}
          cx={x}
          cy={y}
          r="0.46"
          fill="none"
          strokeWidth="0.07"
          pointerEvents="none"
        />
      )}
      <ellipse cx={x + 0.03} cy={y + 0.075} rx="0.4" ry="0.37" fill="#2A1A0A" opacity="0.4" filter="url(#xq-soft)" pointerEvents="none" />
      <circle cx={x} cy={y} r="0.39" fill="url(#xq-disc)" stroke="#8A5E2E" strokeWidth="0.035" />
      <circle cx={x} cy={y + 0.012} r="0.315" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="0.022" />
      <circle cx={x} cy={y} r="0.315" fill="none" stroke="#9A6B30" strokeOpacity="0.85" strokeWidth="0.022" />
      <text
        x={x}
        y={y + 0.02}
        className="font-han"
        fontSize="0.4"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fillOpacity="0.55"
        pointerEvents="none"
      >
        {glyph}
      </text>
      <text
        x={x}
        y={y}
        className="font-han"
        fontSize="0.4"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        fill={ink}
        pointerEvents="none"
      >
        {glyph}
      </text>
    </g>
  );
}

export const PieceDisc = memo(PieceDiscImpl);
