"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { CULTURE_FACTS } from "@/lib/culture";

// Thẻ "Cổ tích bàn cờ": mỗi lần một điều thú vị, tự đổi sau vài giây, bấm để xem điều khác
export function CultureCard({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Bắt đầu từ một mục ngẫu nhiên sau khi tải, tránh lệch giữa server và client
  useEffect(() => {
    setIndex(Math.floor(Math.random() * CULTURE_FACTS.length));
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % CULTURE_FACTS.length), 14000);
    return () => clearInterval(timer);
  }, [paused]);

  const fact = CULTURE_FACTS[index];
  return (
    <aside
      className={`panel-lacquer panel-frame meander-top rounded-lg px-4 pb-4 pt-5 ${className}`}
      aria-label="Văn hóa cờ tướng"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-start gap-4">
        {fact.han && (
          <p
            className="font-han shrink-0 text-3xl font-bold leading-tight text-primary [writing-mode:vertical-rl]"
            aria-hidden
            style={{ maxHeight: "7.5rem" }}
          >
            {fact.han}
          </p>
        )}
        <div key={index} className="rise min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cổ tích bàn cờ</p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-snug">{fact.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{fact.body}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % CULTURE_FACTS.length)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Chuyện khác
      </button>
    </aside>
  );
}
