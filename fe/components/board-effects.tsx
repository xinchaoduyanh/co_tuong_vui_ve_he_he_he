"use client";

import type React from "react";

// Hiệu ứng vẽ trong SVG bàn cờ (đơn vị = ô cờ) và CSS keyframes dùng chung.
// Loại quân (chữ thường): r xe, h mã, e tượng, a sĩ, k tướng, c pháo, p tốt
export type PieceKind = "r" | "h" | "e" | "a" | "k" | "c" | "p";

export interface Burst {
  id: number;
  x: number;
  y: number;
  color: "r" | "b"; // màu quân bị ăn
  attacker: PieceKind; // quân đi ăn
  victim: PieceKind; // quân bị ăn
  dx: number; // hướng đi của quân ăn (đã chuẩn hóa về -1, 0, 1)
  dy: number;
}

const PIECE_NAME: Record<PieceKind, string> = {
  r: "Xe", h: "Mã", e: "Tượng", a: "Sĩ", k: "Tướng", c: "Pháo", p: "Tốt",
};

// Ký tự trên bàn cờ (r h e a k c p / R H E A K C P) -> loại quân
export function pieceKindOf(ch: string | undefined): PieceKind | null {
  if (!ch || ch === ".") return null;
  const k = ch.toLowerCase();
  return "rheakcp".includes(k) ? (k as PieceKind) : null;
}

export function BoardEffectsStyles() {
  return (
    <style>{`
      @keyframes xq-slide { from { transform: translate(var(--dx), var(--dy)); } to { transform: translate(0, 0); } }
      @keyframes xq-pop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
      @keyframes xq-ring { from { transform: scale(0.3); opacity: 0.9; } to { transform: scale(2.2); opacity: 0; } }
      @keyframes xq-ghost { from { transform: scale(1) rotate(0); opacity: 0.95; } to { transform: scale(0.2) rotate(200deg); opacity: 0; } }
      @keyframes xq-shard { from { transform: translate(0, 0) scale(1); opacity: 1; } to { transform: translate(var(--sx), var(--sy)) scale(0.2); opacity: 0; } }
      @keyframes xq-label { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-0.9px); opacity: 0; } }
      @keyframes xq-glow { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
      @keyframes xq-flip { 0% { transform: scale(1, 1); opacity: 0.95; } 50% { transform: scale(0.05, 1) rotate(90deg); opacity: 0.9; } 100% { transform: scale(1, 0.2) rotate(180deg); opacity: 0; } }
      @keyframes xq-sink { from { transform: translate(0, 0) scale(1); opacity: 0.95; } to { transform: translate(0, 0.5px) scale(0.5, 0.15); opacity: 0; } }
      @keyframes xq-hop { 0% { transform: translate(0, 0) rotate(0); opacity: 0.95; } 35% { transform: translate(0, -0.75px) rotate(-25deg); opacity: 1; } 100% { transform: translate(0.2px, 0.6px) rotate(70deg); opacity: 0; } }
      @keyframes xq-slideout { from { transform: translate(0, 0) scale(1); opacity: 0.95; } to { transform: translate(var(--sx), var(--sy)) scale(0.6); opacity: 0; } }
      @keyframes xq-swell { 0% { transform: scale(1); opacity: 0.95; } 30% { transform: scale(1.35); opacity: 1; } 100% { transform: scale(0.1); opacity: 0; } }
      @keyframes xq-slash { 0% { stroke-dashoffset: 1.4; opacity: 1; } 60% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
      @keyframes xq-fire { 0% { transform: scale(0.2); opacity: 1; } 40% { transform: scale(1.5); opacity: 0.95; } 100% { transform: scale(2.1); opacity: 0; } }
      @keyframes xq-smoke { from { transform: translate(0, 0) scale(0.5); opacity: 0.6; } to { transform: translate(var(--sx), var(--sy)) scale(1.6); opacity: 0; } }
      @keyframes xq-streak { from { transform: translate(var(--sx), var(--sy)) scaleX(0.3); opacity: 0.95; } to { transform: translate(0, 0) scaleX(1); opacity: 0; } }
      @keyframes xq-seal { 0% { transform: scale(2.2) rotate(-10deg); opacity: 0; } 35% { transform: scale(1) rotate(-6deg); opacity: 1; } 100% { transform: scale(1.1) rotate(-6deg); opacity: 0; } }
      @keyframes xq-ray { from { transform: scale(0.3); opacity: 0.9; } to { transform: scale(1.8); opacity: 0; } }
      @keyframes xq-boardshake { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(-0.05px, 0.04px); } 40% { transform: translate(0.05px, -0.04px); } 60% { transform: translate(-0.03px, -0.03px); } 80% { transform: translate(0.03px, 0.03px); } }
      .xq-slide { animation: xq-slide 0.28s cubic-bezier(0.22, 0.8, 0.3, 1); }
      .xq-land { transform-box: fill-box; transform-origin: center; animation: xq-pop 0.35s ease-out 0.2s; }
      .xq-fx { transform-box: fill-box; transform-origin: center; pointer-events: none; }
      .xq-lastmove { animation: xq-glow 1.6s ease-in-out infinite; }
    `}</style>
  );
}

const GOLD = "#FFB300";

// Ăn quân: hiệu ứng ghép từ hai lớp — "đòn" của quân đi ăn (A) và "phản ứng" của quân bị ăn (B),
// nên mỗi cặp A ăn B cho ra một cảnh riêng, kèm nhãn "Pháo ăn Mã!".
export function CaptureBurst({ burst }: { burst: Burst }) {
  const { x, y, attacker, victim, dx, dy } = burst;
  const fill = burst.color === "r" ? "#D32F2F" : "#263238";
  const label = `${PIECE_NAME[attacker]} ăn ${PIECE_NAME[victim]}!`;
  const dir = { dx: dx || 0, dy: dy || 0 };
  return (
    <g pointerEvents="none">
      <AttackLayer kind={attacker} x={x} y={y} dx={dir.dx} dy={dir.dy} />
      <VictimLayer kind={victim} x={x} y={y} dx={dir.dx} dy={dir.dy} fill={fill} />
      <text className="xq-fx" x={x} y={y - 0.5} fontSize="0.3" fontWeight="bold" fill="#E53935"
        stroke="#fff" strokeWidth="0.02" textAnchor="middle" style={{ animation: "xq-label 1s ease-out forwards" }}>
        {label}
      </text>
    </g>
  );
}

function ring(x: number, y: number, r: number, stroke: string, w: number, dur = 0.6, delay = 0) {
  return (
    <circle className="xq-fx" cx={x} cy={y} r={r} fill="none" stroke={stroke} strokeWidth={w}
      style={{ animation: `xq-ring ${dur}s ease-out ${delay}s forwards` }} />
  );
}

// Lớp "đòn": phụ thuộc quân đi ăn
function AttackLayer({ kind, x, y, dx, dy }: { kind: PieceKind; x: number; y: number; dx: number; dy: number }) {
  switch (kind) {
    case "c": // Pháo: cầu lửa + khói
      return (
        <g>
          <circle className="xq-fx" cx={x} cy={y} r="0.35" fill="#FF6D00" opacity="0.9" style={{ animation: "xq-fire 0.55s ease-out forwards" }} />
          <circle className="xq-fx" cx={x} cy={y} r="0.2" fill="#FFEB3B" style={{ animation: "xq-fire 0.4s ease-out forwards" }} />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 + 0.4;
            return (
              <circle key={i} className="xq-fx" cx={x} cy={y} r="0.18" fill="#78909C"
                style={{ ["--sx" as any]: `${Math.cos(a) * 0.8}px`, ["--sy" as any]: `${Math.sin(a) * 0.8 - 0.2}px`, animation: `xq-smoke ${0.8 + i * 0.05}s ease-out 0.1s forwards` }} />
            );
          })}
        </g>
      );
    case "r": { // Xe: vệt tốc độ dọc hướng đi
      const len = 1.6;
      return (
        <g>
          {[-0.18, 0, 0.18].map((o, i) => {
            // vuông góc với hướng đi
            const px = -dy * o, py = dx * o;
            const horiz = dx !== 0;
            return (
              <rect key={i} className="xq-fx"
                x={horiz ? x - (dx > 0 ? len : 0) : x + px - 0.02} y={horiz ? y + py - 0.02 : y - (dy > 0 ? len : 0)}
                width={horiz ? len : 0.04} height={horiz ? 0.04 : len} fill={GOLD}
                style={{ ["--sx" as any]: `${-dx * 0.6}px`, ["--sy" as any]: `${-dy * 0.6}px`, animation: `xq-streak ${0.35 + i * 0.05}s ease-out forwards` }} />
            );
          })}
          {ring(x, y, 0.4, GOLD, 0.07, 0.45)}
        </g>
      );
    }
    case "h": // Mã: vó đạp, bụi hai bên
      return (
        <g>
          {ring(x, y, 0.3, "#8D6E63", 0.09, 0.5)}
          {[-1, 1].map((sd) => (
            <circle key={sd} className="xq-fx" cx={x} cy={y + 0.25} r="0.14" fill="#BCAAA4"
              style={{ ["--sx" as any]: `${sd * 0.7}px`, ["--sy" as any]: "0.05px", animation: "xq-smoke 0.7s ease-out forwards" }} />
          ))}
          {ring(x, y, 0.3, GOLD, 0.05, 0.6, 0.12)}
        </g>
      );
    case "e": // Tượng: gợn nước
      return (
        <g>
          {ring(x, y, 0.3, "#4FC3F7", 0.07, 0.7)}
          {ring(x, y, 0.3, "#81D4FA", 0.05, 0.8, 0.12)}
          {ring(x, y, 0.3, "#B3E5FC", 0.04, 0.9, 0.25)}
        </g>
      );
    case "a": // Sĩ: hai nhát chém chéo
      return (
        <g>
          {[[-1, -1, 1, 1], [1, -1, -1, 1]].map(([x1, y1, x2, y2], i) => (
            <line key={i} className="xq-fx" x1={x + x1 * 0.5} y1={y + y1 * 0.5} x2={x + x2 * 0.5} y2={y + y2 * 0.5}
              stroke="#ECEFF1" strokeWidth="0.07" strokeLinecap="round" strokeDasharray="1.4"
              style={{ animation: `xq-slash 0.5s ease-out ${i * 0.12}s both` }} />
          ))}
          {ring(x, y, 0.3, "#CFD8DC", 0.05, 0.5, 0.15)}
        </g>
      );
    case "k": // Tướng: ấn vàng + tia sáng
      return (
        <g>
          <rect className="xq-fx" x={x - 0.28} y={y - 0.28} width="0.56" height="0.56" rx="0.06" fill="none"
            stroke={GOLD} strokeWidth="0.09" style={{ animation: "xq-seal 0.8s ease-out forwards" }} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <line key={i} className="xq-fx" x1={x + Math.cos(a) * 0.45} y1={y + Math.sin(a) * 0.45}
                x2={x + Math.cos(a) * 0.8} y2={y + Math.sin(a) * 0.8} stroke={GOLD} strokeWidth="0.05"
                style={{ animation: "xq-ray 0.7s ease-out forwards" }} />
            );
          })}
        </g>
      );
    default: // Tốt: chấm nhỏ bật lên
      return (
        <g>
          {ring(x, y, 0.3, GOLD, 0.06, 0.45)}
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return (
              <circle key={i} className="xq-fx" cx={x} cy={y} r="0.06" fill={GOLD}
                style={{ ["--sx" as any]: `${Math.cos(a) * 0.55}px`, ["--sy" as any]: `${Math.sin(a) * 0.55}px`, animation: "xq-shard 0.45s ease-out forwards" }} />
            );
          })}
        </g>
      );
  }
}

function shards(x: number, y: number, n: number, colors: string[], size: number, spread = 0.7) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
    const dist = spread + (i % 3) * 0.2;
    return (
      <rect key={i} className="xq-fx" x={x - size / 2} y={y - size / 2} width={size} height={size}
        fill={colors[i % colors.length]}
        style={{
          ["--sx" as any]: `${Math.cos(angle) * dist}px`,
          ["--sy" as any]: `${Math.sin(angle) * dist}px`,
          animation: `xq-shard ${0.5 + (i % 3) * 0.1}s ease-out forwards`,
        }} />
    );
  });
}

// Lớp "phản ứng": phụ thuộc quân bị ăn
function VictimLayer({ kind, x, y, dx, dy, fill }: { kind: PieceKind; x: number; y: number; dx: number; dy: number; fill: string }) {
  const ghost = (anim: string, extra: React.CSSProperties = {}) => (
    <circle className="xq-fx" cx={x} cy={y} r="0.38" fill={fill} opacity="0.9" style={{ animation: anim, ...extra }} />
  );
  switch (kind) {
    case "p": // Tốt: lật úp rồi tan
      return <g>{ghost("xq-flip 0.55s ease-in forwards")}{shards(x, y, 4, [fill], 0.08, 0.5)}</g>;
    case "a": // Sĩ: vỡ như sứ
      return <g>{ghost("xq-ghost 0.35s ease-in forwards")}{shards(x, y, 12, ["#ECEFF1", "#B0BEC5", fill], 0.08, 0.8)}</g>;
    case "e": // Tượng: chìm xuống nước
      return <g>{ghost("xq-sink 0.7s ease-in forwards", { filter: "hue-rotate(0deg)" })}{shards(x, y, 5, ["#81D4FA", "#B3E5FC"], 0.07, 0.45)}</g>;
    case "h": // Mã: bật lên rồi rơi
      return <g>{ghost("xq-hop 0.7s ease-in forwards")}{shards(x, y, 6, [fill, "#BCAAA4"], 0.08, 0.6)}</g>;
    case "r": // Xe: trượt đi theo hướng bị đẩy
      return (
        <g>
          {ghost("xq-slideout 0.6s ease-in forwards", { ["--sx" as any]: `${dx * 1.6}px`, ["--sy" as any]: `${dy * 1.6}px` })}
          {shards(x, y, 6, [fill, GOLD], 0.09, 0.6)}
        </g>
      );
    case "c": // Pháo: phình lên rồi nổ
      return <g>{ghost("xq-swell 0.5s ease-in forwards")}{shards(x, y, 14, ["#FF6D00", "#FFEB3B", fill], 0.1, 0.9)}</g>;
    default: // Tướng
      return <g>{ghost("xq-ghost 0.55s ease-in forwards")}{shards(x, y, 10, [fill, GOLD], 0.1)}</g>;
  }
}

// Vòng sóng vàng lan ra khi quân hạ xuống ô đến
export function LandRing({ x, y }: { x: number; y: number }) {
  return (
    <circle className="xq-landring" cx={x} cy={y} r="0.42" fill="none" stroke="#E3B65B" strokeWidth="0.06" />
  );
}

// Lớp phủ HTML khi chiếu tướng: viền đỏ nháy một lần và con dấu CHIẾU TƯỚNG
export function CheckOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <div className="xq-flash absolute inset-0" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="xq-stamp rounded-md border-[5px] border-primary bg-background/55 px-4 py-1 text-3xl font-extrabold uppercase leading-tight tracking-wide text-primary sm:text-5xl">
          CHIẾU TƯỚNG
        </span>
      </div>
    </div>
  );
}
