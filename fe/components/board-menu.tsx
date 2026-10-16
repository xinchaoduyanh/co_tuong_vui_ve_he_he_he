"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BoardSurface } from "@/components/board/board-surface";

// Menu là một bàn cờ thật: mỗi mục là một quân đứng trên bàn.
// Rê chuột vào quân thì hiện đúng các ô quân đó có thể đi; bấm thì quân trượt vào giữa bàn rồi mới chuyển trang.
// Kích thước dùng đơn vị cqw của khung bàn (1 ô = 10cqw) nên co giãn theo bề ngang.

export type PieceType = "G" | "A" | "E" | "H" | "R" | "C" | "S";

export interface MenuPiece {
  id: string;
  href: string;
  x: number;
  y: number;
  side: "r" | "b";
  type: PieceType;
  title: string;
  hint?: string;
  badge?: string;
  // Nhãn nằm bên phải hay bên trái quân
  labelSide?: "right" | "left";
}

const GLYPH: Record<"r" | "b", Record<PieceType, string>> = {
  r: { G: "帥", A: "仕", E: "相", H: "傌", R: "俥", C: "炮", S: "兵" },
  b: { G: "將", A: "士", E: "象", H: "馬", R: "車", C: "砲", S: "卒" },
};

const BACK_RANK: PieceType[] = ["R", "H", "E", "A"];

// Các ô quân có thể tới (chỉ để minh họa, không xét quân khác)
function previewMoves(p: MenuPiece): Array<[number, number]> {
  const inBoard = ([x, y]: [number, number]) => x >= 0 && x <= 8 && y >= 0 && y <= 9;
  const out: Array<[number, number]> = [];
  const { x, y } = p;
  const palace = (nx: number, ny: number) => nx >= 3 && nx <= 5 && (p.side === "r" ? ny <= 2 : ny >= 7);
  switch (p.type) {
    case "H":
      for (const [dx, dy] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) out.push([x + dx, y + dy]);
      break;
    case "R":
    case "C":
      for (let d = 1; d <= 3; d++) out.push([x + d, y], [x - d, y], [x, y + d], [x, y - d]);
      break;
    case "A":
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (palace(x + dx, y + dy)) out.push([x + dx, y + dy]);
      break;
    case "G":
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (palace(x + dx, y + dy)) out.push([x + dx, y + dy]);
      break;
    case "E":
      for (const [dx, dy] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
        const ny = y + dy;
        if (p.side === "r" ? ny <= 4 : ny >= 5) out.push([x + dx, ny]);
      }
      break;
    case "S":
      out.push([x, y + (p.side === "r" ? 1 : -1)]);
      break;
  }
  return out.filter(inBoard);
}

function Disc({ side, glyph, size, glow, lifted }: { side: "r" | "b"; glyph: string; size: string; glow?: boolean; lifted?: boolean }) {
  return (
    <span
      aria-hidden
      className={`font-han relative flex items-center justify-center rounded-full font-bold leading-none transition-transform duration-200 ${
        lifted ? "-translate-y-[0.6cqw] scale-110" : ""
      } ${glow ? "xq-menu-glow" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: `calc(${size} * 0.52)`,
        color: side === "r" ? "#C0281B" : "#1B1B1B",
        background: "radial-gradient(circle at 35% 30%, #F8E9BF, #E5C584 55%, #C99B55)",
        boxShadow: `0 ${lifted ? "1.4cqw" : "0.6cqw"} ${lifted ? "2.2cqw" : "1.1cqw"} -0.3cqw rgb(30 16 4 / ${lifted ? 0.55 : 0.45}), inset 0 0 0 0.35cqw #8A5E2E, inset 0 0 0 0.9cqw rgb(154 107 48 / 0.35)`,
        textShadow: "0 0.12cqw 0 rgb(255 255 255 / 0.5)",
      }}
    >
      {glyph}
    </span>
  );
}

export function BoardMenu({
  pieces,
  cta,
  className = "",
}: {
  pieces: MenuPiece[];
  // Hai Tướng đối mặt: nút chính đặt trên dải sông
  cta?: { href: string; title: string; hint?: string; badge?: string };
  className?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pos = (x: number, y: number) => ({ left: `${(x + 1) * 10}%`, top: `${((y + 1) * 100) / 11}%` });

  const go = (e: React.MouseEvent, id: string, href: string) => {
    // Giữ hành vi mặc định khi mở tab mới (Ctrl/Cmd/Shift/giữa chuột)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }
    setLeaving(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.push(href), 380);
  };

  const ctaActive = hover === "cta" || leaving === "cta";
  const hovered = pieces.find((p) => p.id === hover);
  const dots = hovered ? previewMoves(hovered) : [];

  // Quân trang trí hàng cuối hai bên cho bàn cờ có đủ "người"
  const decor: Array<{ x: number; y: number; side: "r" | "b"; type: PieceType }> = [];
  [0, 1, 2, 3].forEach((i) => {
    decor.push({ x: i, y: 0, side: "r", type: BACK_RANK[i] }, { x: 8 - i, y: 0, side: "r", type: BACK_RANK[i] });
    decor.push({ x: i, y: 9, side: "b", type: BACK_RANK[i] }, { x: 8 - i, y: 9, side: "b", type: BACK_RANK[i] });
  });
  const taken = new Set(pieces.map((p) => `${p.x},${p.y}`));

  return (
    <div
      className={`relative mx-auto w-full max-w-[600px] ${className}`}
      style={{ aspectRatio: "10 / 11", containerType: "inline-size" }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl shadow-[0_28px_60px_-28px_hsl(150_14%_2%/0.9)]">
        <svg viewBox="-1 -1 10 11" className="h-full w-full" aria-hidden>
          <BoardSurface />
          {cta && (
            <g>
              <line x1="4" y1="1.5" x2="4" y2="7.5" stroke="#E3B65B" strokeOpacity={ctaActive ? 0.45 : 0.18} strokeWidth="0.3" />
              <line className="xq-flow" x1="4" y1="1.5" x2="4" y2="7.5" stroke="#E3B65B" strokeOpacity={ctaActive ? 1 : 0.7} strokeWidth="0.06" strokeDasharray="0.2 0.14" />
            </g>
          )}
        </svg>
      </div>

      {/* Quân trang trí */}
      {decor
        .filter((d) => !taken.has(`${d.x},${d.y}`))
        .map((d, i) => (
          <div key={i} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 opacity-60" style={pos(d.x, d.y)}>
            <Disc side={d.side} glyph={GLYPH[d.side][d.type]} size="7.4cqw" />
          </div>
        ))}

      {/* Các ô gợi ý khi rê vào một quân */}
      {dots.map(([dx, dy], i) => (
        <span
          key={`${hover}-${dx}-${dy}`}
          aria-hidden
          className="xq-dot-in pointer-events-none absolute h-[2.8cqw] w-[2.8cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FA37F]"
          style={{ ...pos(dx, dy), animationDelay: `${i * 22}ms` }}
        />
      ))}

      {/* Hai Tướng đối mặt: nút chính */}
      {cta && (
        <>
          {([
            { x: 4, y: 1.5, side: "r" as const, type: "G" as const },
            { x: 4, y: 7.5, side: "b" as const, type: "G" as const },
          ]).map((g) => (
            <div
              key={g.side}
              className="pointer-events-none absolute"
              style={{
                ...pos(g.x, g.y),
                transform: `translate(-50%, -50%) ${leaving === "cta" ? `translateY(${g.side === "r" ? "" : "-"}28cqw) scale(0.9)` : ""}`,
                transition: "transform 0.38s cubic-bezier(0.5, 0, 0.2, 1)",
              }}
            >
              <Disc side={g.side} glyph={GLYPH[g.side].G} size="12.5cqw" glow lifted={ctaActive} />
            </div>
          ))}

          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pos(4, 4.5)}>
            <Link
              href={cta.href}
              onClick={(e) => go(e, "cta", cta.href)}
              onMouseEnter={() => setHover("cta")}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover("cta")}
              onBlur={() => setHover(null)}
              aria-label={`${cta.title}${cta.hint ? `. ${cta.hint}` : ""}`}
              className="panel-lacquer group relative flex min-h-[44px] flex-col items-center whitespace-nowrap rounded-md px-[3.2cqw] py-[1.1cqw] text-center ring-1 ring-[#E3B65B]/70 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:ring-2 hover:shadow-[0_0_3cqw_0_rgb(227_182_91/0.45)] focus-visible:ring-2 focus-visible:ring-[#E3B65B]"
            >
              {cta.badge && (
                <span className="absolute -top-[1.6cqw] left-1/2 -translate-x-1/2 -rotate-2 rounded-[3px] bg-primary px-[1.4cqw] py-px text-[clamp(10px,2.1cqw,12px)] font-semibold uppercase tracking-wide text-primary-foreground">
                  {cta.badge}
                </span>
              )}
              <span className="font-han text-[clamp(16px,5.4cqw,30px)] font-bold leading-none text-[#E3B65B]">對弈</span>
              <span className="mt-[0.5cqw] font-display text-[clamp(14px,4cqw,24px)] font-bold leading-tight text-foreground">
                {cta.title}
              </span>
            </Link>
          </div>
        </>
      )}

      {/* Các quân là mục menu */}
      {pieces.map((p, i) => {
        const isLeaving = leaving === p.id;
        const isHover = hover === p.id;
        return (
          <div
            key={p.id}
            className="absolute"
            style={{
              ...pos(p.x, p.y),
              transform: `translate(-50%, -50%) ${isLeaving ? `translate(${(4 - p.x) * 10}cqw, ${(4.5 - p.y) * 10}cqw) scale(1.12)` : ""}`,
              transition: "transform 0.38s cubic-bezier(0.5, 0, 0.2, 1)",
              zIndex: isLeaving || isHover ? 5 : 2,
            }}
          >
            <Link
              href={p.href}
              onClick={(e) => go(e, p.id, p.href)}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.id)}
              onBlur={() => setHover(null)}
              aria-label={`${p.title}${p.hint ? `. ${p.hint}` : ""}`}
              className="group relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="xq-bob block" style={{ animationDelay: `${i * -0.7}s` }}>
                <Disc side={p.side} glyph={GLYPH[p.side][p.type]} size="11cqw" lifted={isHover} glow={isHover} />
              </span>
              <span
                className={`panel-lacquer absolute left-1/2 top-full mt-[1.2cqw] w-max max-w-[30cqw] -translate-x-1/2 rounded-md px-[2cqw] py-[0.9cqw] text-center ring-1 ring-[#B9863A]/50 transition-shadow duration-200 ${
                  isHover ? "shadow-[0_0_2.4cqw_0_rgb(227_182_91/0.4)] ring-[#E3B65B]" : ""
                }`}
              >
                <span className="block font-display text-[clamp(12px,3.1cqw,17px)] font-bold leading-tight text-foreground">{p.title}</span>
                {p.hint && <span className="xq-hint mt-0.5 text-[clamp(11px,2.1cqw,13px)] leading-tight text-muted-foreground">{p.hint}</span>}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
