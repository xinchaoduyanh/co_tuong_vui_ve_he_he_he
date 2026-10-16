"use client";

// Hiệu ứng vẽ trong SVG bàn cờ (đơn vị = ô cờ) và CSS keyframes dùng chung.
export interface Burst {
  id: number;
  x: number;
  y: number;
  color: "r" | "b";
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
      .xq-slide { animation: xq-slide 0.28s cubic-bezier(0.22, 0.8, 0.3, 1); }
      .xq-land { transform-box: fill-box; transform-origin: center; animation: xq-pop 0.35s ease-out 0.2s; }
      .xq-fx { transform-box: fill-box; transform-origin: center; pointer-events: none; }
      .xq-lastmove { animation: xq-glow 1.6s ease-in-out infinite; }
    `}</style>
  );
}

const SHARDS = 10;

// Hiệu ứng ăn quân: sóng xung kích, quân bị ăn xoay mờ dần, mảnh vỡ bắn ra, chữ "Ăn!"
export function CaptureBurst({ burst }: { burst: Burst }) {
  const fill = burst.color === "r" ? "#D32F2F" : "#263238";
  return (
    <g pointerEvents="none">
      {/* Ảnh tùy chọn từ public/fx/capture-burst.png; không có file thì ẩn */}
      <image className="xq-fx" href="/fx/capture-burst.png" x={burst.x - 1} y={burst.y - 1} width="2" height="2"
        style={{ animation: "xq-ring 0.6s ease-out forwards" }}
        onError={(e) => ((e.currentTarget as SVGImageElement).style.display = "none")} />
      <circle className="xq-fx" cx={burst.x} cy={burst.y} r="0.4" fill="none" stroke="#FFB300" strokeWidth="0.08"
        style={{ animation: "xq-ring 0.6s ease-out forwards" }} />
      <circle className="xq-fx" cx={burst.x} cy={burst.y} r="0.38" fill={fill} opacity="0.9"
        style={{ animation: "xq-ghost 0.55s ease-in forwards" }} />
      {Array.from({ length: SHARDS }, (_, i) => {
        const angle = (i / SHARDS) * Math.PI * 2 + (i % 2) * 0.3;
        const dist = 0.7 + (i % 3) * 0.25;
        return (
          <rect key={i} className="xq-fx" x={burst.x - 0.05} y={burst.y - 0.05} width="0.1" height="0.1"
            fill={i % 2 ? "#FFB300" : fill}
            style={{
              ["--sx" as any]: `${Math.cos(angle) * dist}px`,
              ["--sy" as any]: `${Math.sin(angle) * dist}px`,
              animation: `xq-shard ${0.5 + (i % 3) * 0.1}s ease-out forwards`,
            }} />
        );
      })}
      <text className="xq-fx" x={burst.x} y={burst.y - 0.5} fontSize="0.3" fontWeight="bold" fill="#E53935"
        stroke="#fff" strokeWidth="0.02" textAnchor="middle" style={{ animation: "xq-label 0.9s ease-out forwards" }}>
        Ăn!
      </text>
    </g>
  );
}

// Vòng sóng vàng lan ra khi quân hạ xuống ô đến
export function LandRing({ x, y }: { x: number; y: number }) {
  return (
    <circle className="xq-landring" cx={x} cy={y} r="0.42" fill="none" stroke="#E3B65B" strokeWidth="0.06" />
  );
}

// Lớp phủ HTML khi chiếu tướng: viền đỏ nháy một lần và con dấu 將軍
export function CheckOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <div className="xq-flash absolute inset-0" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="xq-stamp font-han rounded-md border-[5px] border-primary bg-background/55 px-4 py-1 text-6xl font-bold leading-tight text-primary sm:text-7xl">
          將軍
        </span>
      </div>
    </div>
  );
}
