"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActiveMatch } from "@/lib/api/hooks/use-active-match";

// Còn trận dở: thanh cố định ở mọi trang (trừ bàn cờ) cùng nút vào lại;
// tự đưa về bàn cờ một lần cho mỗi lần tải trang.
export function RejoinBanner() {
  const match = useActiveMatch();
  const router = useRouter();
  const pathname = usePathname();
  const autoOpened = useRef<string | null>(null);
  const onBoard = pathname === "/game-board";

  useEffect(() => {
    if (!match || onBoard || autoOpened.current === match.matchId) return;
    autoOpened.current = match.matchId;
    router.push(`/game-board?matchId=${match.matchId}`);
  }, [match, onBoard, router]);

  if (!match || onBoard) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-banner flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-primary px-4 py-2 text-primary-foreground">
      <span className="text-sm">
        Bạn đang trong trận với <strong className="font-semibold">{match.opponent}</strong>. Rời quá lâu sẽ bị xử thua.
      </span>
      <button
        type="button"
        onClick={() => router.push(`/game-board?matchId=${match.matchId}`)}
        className="h-9 rounded-md bg-primary-foreground px-4 text-sm font-semibold text-primary transition-transform hover:bg-primary-foreground/90 active:scale-[0.98]"
      >
        Vào lại trận
      </button>
    </div>
  );
}
