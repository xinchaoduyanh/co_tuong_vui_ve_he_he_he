// Lớp phụ họa chạy sau giao diện: cò bay ngang trời, đèn lồng đung đưa, sương trôi, lá tre rơi.
// Chỉ animate transform/opacity, không bắt chuột, tự ẩn khi người dùng bật "giảm chuyển động".
// Ảnh cò, đèn lồng và sương do agy sinh (public/fx); thiếu ảnh thì phần đó chỉ không hiện.
const LEAVES = [
  { left: "8%", delay: "0s", dur: "26s", size: 26, sway: "3.2s" },
  { left: "27%", delay: "-9s", dur: "32s", size: 20, sway: "4.1s" },
  { left: "46%", delay: "-17s", dur: "29s", size: 24, sway: "3.6s" },
  { left: "68%", delay: "-5s", dur: "35s", size: 18, sway: "4.6s" },
  { left: "88%", delay: "-22s", dur: "30s", size: 22, sway: "3.9s" },
];

function Leaf({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.32} viewBox="0 0 40 13" aria-hidden>
      <path d="M0 6.5C10 -1 28 -1 40 6.5 28 14 10 14 0 6.5Z" fill="currentColor" />
      <path d="M2 6.5H38" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.6" />
    </svg>
  );
}

export function AmbientLayer() {
  return (
    <div
      aria-hidden
      className="ambient pointer-events-none fixed inset-0 -z-[1] overflow-hidden motion-reduce:hidden"
    >
      <div className="ambient-mist ambient-mist-a" />
      <div className="ambient-mist ambient-mist-b" />

      {[
        { top: "9%", w: 150, dur: "58s", delay: "-6s", op: 1 },
        { top: "24%", w: 96, dur: "76s", delay: "-41s", op: 0.8 },
        { top: "15%", w: 70, dur: "92s", delay: "-63s", op: 0.6 },
      ].map((c, i) => (
        <div
          key={i}
          className={`crane ${i > 0 ? "hidden sm:block" : ""}`}
          style={{ top: c.top, width: c.w, ["--dur" as string]: c.dur, animationDelay: c.delay, opacity: c.op }}
        >
          <div className="crane-sprite" />
        </div>
      ))}

      <div className="lantern lantern-l" />
      <div className="lantern lantern-r" />

      {LEAVES.map((leaf, i) => (
        <div
          key={i}
          className="leaf-fall"
          style={{ left: leaf.left, animationDuration: leaf.dur, animationDelay: leaf.delay }}
        >
          <div className="leaf-sway" style={{ animationDuration: leaf.sway }}>
            <Leaf size={leaf.size} />
          </div>
        </div>
      ))}
    </div>
  );
}
